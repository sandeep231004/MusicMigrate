import asyncio
import json

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from models import ManualMatchRequest, MatchCandidate, TransferItem, UnmatchedTrack
from routers.auth import get_oauth
from services import spotify_service, ytmusic_service
from services.matcher import match_track
from session_store import get_session, set_session

router = APIRouter()


def _get_valid_token(session_id: str, session: dict) -> dict:
    token_info = session.get("spotify_token_info")
    if not token_info:
        raise HTTPException(status_code=401, detail="Spotify not authenticated")
    sp_oauth = get_oauth(session)
    if sp_oauth.is_token_expired(token_info):
        token_info = sp_oauth.refresh_access_token(token_info["refresh_token"])
        set_session(session_id, "spotify_token_info", token_info)
    return token_info


def _require_spotify(request: Request) -> tuple[str, dict, dict]:
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    token_info = _get_valid_token(session_id, session)
    return session_id, session, token_info


@router.get("/search-track", response_model=list[MatchCandidate])
async def search_track(title: str, artist: str, request: Request):
    session_id, session, token_info = _require_spotify(request)
    sp = spotify_service.get_client(token_info)
    return await asyncio.to_thread(spotify_service.search_track, sp, title, artist)


@router.post("/manual-match")
async def manual_match(body: ManualMatchRequest, request: Request):
    session_id, session, token_info = _require_spotify(request)
    sp = spotify_service.get_client(token_info)
    existing = await asyncio.to_thread(
        spotify_service.get_playlist_track_ids, sp, body.playlist_id
    )
    if body.spotify_track_id not in existing:
        await asyncio.to_thread(
            spotify_service.add_tracks_to_playlist,
            sp,
            body.playlist_id,
            [body.spotify_track_id],
        )
    return {"success": True}


async def _transfer_stream(items: list[TransferItem], session_id: str, session: dict):
    def sse(data: dict) -> str:
        return f"data: {json.dumps(data)}\n\n"

    try:
        token_info = _get_valid_token(session_id, session)
        sp = spotify_service.get_client(token_info)
        headers_path = session.get("headers_auth_path")
        user_id = await asyncio.to_thread(spotify_service.get_current_user_id, sp)

        unmatched: list[UnmatchedTrack] = []
        total_items = len(items)
        total_processed = 0
        total_matched = 0
        total_unmatched = 0

        for item_idx, item in enumerate(items):
            yield sse({"event": "item_start", "item": {"name": item.name, "type": item.type}})

            if item.type == "playlist":
                tracks = await asyncio.to_thread(
                    ytmusic_service.get_playlist_tracks, headers_path, item.id
                )
                total_tracks = len(tracks)

                existing_playlists = await asyncio.to_thread(
                    spotify_service.get_existing_playlists, sp, user_id
                )
                if item.name in existing_playlists:
                    playlist_id = existing_playlists[item.name]
                    existing_track_ids = await asyncio.to_thread(
                        spotify_service.get_playlist_track_ids, sp, playlist_id
                    )
                else:
                    playlist_id = await asyncio.to_thread(
                        spotify_service.create_playlist,
                        sp,
                        item.name,
                        "Migrated from YouTube Music by MusicMigrate",
                    )
                    existing_track_ids = set()

                to_add: list[str] = []
                for i, track in enumerate(tracks, 1):
                    spotify_id, _score = await asyncio.to_thread(
                        match_track, sp, track.title, track.artist
                    )
                    total_processed += 1
                    item_pct = round(i / total_tracks * 100, 1) if total_tracks else 100
                    overall_pct = round((item_idx + i / total_tracks) / total_items * 100, 1)

                    if spotify_id and spotify_id in existing_track_ids:
                        total_matched += 1
                        status = "skipped"
                        track_data = None
                    elif spotify_id:
                        to_add.append(spotify_id)
                        total_matched += 1
                        status = "matched"
                        track_data = None
                    else:
                        total_unmatched += 1
                        status = "unmatched"
                        track_data = {
                            "original_title": track.title,
                            "original_artist": track.artist,
                            "playlist_id": playlist_id,
                            "playlist_name": item.name,
                        }
                        unmatched.append(
                            UnmatchedTrack(
                                playlist_id=playlist_id,
                                playlist_name=item.name,
                                original_title=track.title,
                                original_artist=track.artist,
                            )
                        )

                    payload: dict = {
                        "event": "track_processed",
                        "status": status,
                        "yt_track": track.title,
                        "item_progress": item_pct,
                        "overall_progress": overall_pct,
                        "stats": {
                            "processed": total_processed,
                            "matched": total_matched,
                            "unmatched": total_unmatched,
                        },
                    }
                    if track_data:
                        payload["track_data"] = track_data
                    yield sse(payload)

                if to_add:
                    await asyncio.to_thread(
                        spotify_service.add_tracks_to_playlist, sp, playlist_id, to_add
                    )

            elif item.type == "album":
                spotify_album_id = await asyncio.to_thread(
                    spotify_service.search_album, sp, item.name, item.artist or ""
                )
                total_processed += 1
                if spotify_album_id:
                    saved_ids = await asyncio.to_thread(
                        spotify_service.get_saved_album_ids, sp
                    )
                    if spotify_album_id not in saved_ids:
                        await asyncio.to_thread(
                            spotify_service.save_albums, sp, [spotify_album_id]
                        )
                    total_matched += 1
                else:
                    total_unmatched += 1

            overall_pct = round((item_idx + 1) / total_items * 100, 1)
            yield sse({"event": "item_complete", "item": {"name": item.name, "type": item.type}})

        set_session(session_id, "unmatched_tracks", [u.model_dump() for u in unmatched])
        yield sse({"event": "transfer_complete"})

    except Exception as e:
        yield sse({"event": "error", "message": "Transfer failed. Check backend logs for details."})


@router.get("/transfer")
async def transfer(items: str, request: Request):
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    if not session.get("spotify_token_info"):
        raise HTTPException(status_code=401, detail="Spotify not authenticated")
    if not session.get("ytmusic_authenticated"):
        raise HTTPException(status_code=401, detail="YouTube Music not authenticated")

    try:
        parsed_items = [TransferItem(**i) for i in json.loads(items)]
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid items parameter")

    return StreamingResponse(
        _transfer_stream(parsed_items, session_id, session),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/unmatched")
async def get_unmatched(request: Request):
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        return []
    return session.get("unmatched_tracks", [])
