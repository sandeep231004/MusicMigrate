import asyncio

from fastapi import APIRouter, HTTPException, Request

from models import Album, Playlist, Track
from services import ytmusic_service
from session_store import get_session

router = APIRouter()


def require_ytmusic(request: Request) -> dict:
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session or not session.get("ytmusic_authenticated"):
        raise HTTPException(status_code=401, detail="YouTube Music not authenticated")
    return session


@router.get("/playlists", response_model=list[Playlist])
async def get_playlists(request: Request):
    session = require_ytmusic(request)
    return await asyncio.to_thread(ytmusic_service.get_playlists, session["headers_auth_path"])


@router.get("/albums", response_model=list[Album])
async def get_albums(request: Request):
    session = require_ytmusic(request)
    return await asyncio.to_thread(ytmusic_service.get_library_albums, session["headers_auth_path"])


@router.get("/playlist/{playlist_id}/tracks", response_model=list[Track])
async def get_playlist_tracks(playlist_id: str, request: Request):
    session = require_ytmusic(request)
    return await asyncio.to_thread(ytmusic_service.get_playlist_tracks, session["headers_auth_path"], playlist_id)
