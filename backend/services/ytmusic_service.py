import json

from fastapi import HTTPException
from ytmusicapi import YTMusic

from models import Album, Playlist, Track


def get_client(headers_path: str) -> YTMusic:
    try:
        with open(headers_path, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Could not read auth file: {e}")

    if "access_token" in data or "token_type" in data:
        raise HTTPException(
            status_code=401,
            detail="OAuth auth file detected. Please logout and re-authenticate using the Paste Cookie method.",
        )
    if "Cookie" not in data:
        raise HTTPException(
            status_code=401,
            detail="Invalid auth file - missing Cookie field. Please logout and re-authenticate.",
        )

    return YTMusic(headers_path)


def get_playlists(headers_path: str) -> list[Playlist]:
    yt = get_client(headers_path)
    raw = yt.get_library_playlists(limit=100)
    playlists = []
    for p in raw:
        title = p.get("title", "")
        if title.lower() in ("your likes", "liked music"):
            continue
        thumbnails = p.get("thumbnails", [])
        thumbnail = thumbnails[-1].get("url") if thumbnails else None
        count = p.get("count", 0)
        if isinstance(count, str):
            count = int(count.replace(",", "")) if count.replace(",", "").isdigit() else 0
        playlists.append(
            Playlist(
                id=p["playlistId"],
                name=title,
                description=p.get("description"),
                track_count=count,
                thumbnail_url=thumbnail,
            )
        )
    return playlists


def get_playlist_tracks(headers_path: str, playlist_id: str) -> list[Track]:
    yt = get_client(headers_path)
    result = yt.get_playlist(playlist_id, limit=500)
    tracks = []
    for t in result.get("tracks", []):
        artists = t.get("artists") or []
        artist = artists[0]["name"] if artists else ""
        album = t.get("album")
        album_name = album.get("name") if album else None
        duration_seconds = t.get("duration_seconds")
        duration_ms = duration_seconds * 1000 if duration_seconds else None
        tracks.append(
            Track(
                title=t.get("title", ""),
                artist=artist,
                album=album_name,
                duration_ms=duration_ms,
                ytmusic_video_id=t.get("videoId"),
            )
        )
    return tracks


def get_library_albums(headers_path: str) -> list[Album]:
    yt = get_client(headers_path)
    raw = yt.get_library_albums(limit=100)
    albums = []
    for a in raw:
        artists = a.get("artists") or []
        artist = artists[0]["name"] if artists else ""
        thumbnails = a.get("thumbnails", [])
        thumbnail = thumbnails[-1].get("url") if thumbnails else None
        albums.append(
            Album(
                id=a["browseId"],
                name=a["title"],
                artist=artist,
                year=str(a["year"]) if a.get("year") else None,
                thumbnail_url=thumbnail,
            )
        )
    return albums
