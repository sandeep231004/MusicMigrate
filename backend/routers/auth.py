import json
import os
import tempfile
import time
from hashlib import sha1
import spotipy.oauth2
from fastapi import APIRouter, Body, File, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from spotipy.cache_handler import MemoryCacheHandler

from config import settings
from session_store import get_session, reset_session, set_session

router = APIRouter()
SPOTIFY_SCOPE = (
    "playlist-read-private "
    "playlist-read-collaborative "
    "playlist-modify-public "
    "playlist-modify-private "
    "user-library-modify "
    "user-library-read"
)


def _spotify_redirect_uri() -> str:
    # Trim accidental whitespace/newlines from deployment env values.
    return (settings.SPOTIFY_REDIRECT_URI or "").strip()


def _resolve_spotify_app_credentials(session: dict | None) -> tuple[str, str]:
    client_id = ((session or {}).get("spotify_client_id") or "").strip()
    client_secret = ((session or {}).get("spotify_client_secret") or "").strip()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail=(
                "Spotify app credentials not configured. Enter your Spotify Client ID "
                "and Client Secret on the setup page."
            ),
        )
    return client_id, client_secret


def get_oauth(session: dict | None) -> spotipy.oauth2.SpotifyOAuth:
    client_id, client_secret = _resolve_spotify_app_credentials(session)
    return spotipy.oauth2.SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=_spotify_redirect_uri(),
        scope=SPOTIFY_SCOPE,
        cache_handler=MemoryCacheHandler(),
        open_browser=False,
    )


def _cleanup_headers_file(headers_path: str | None) -> None:
    if headers_path and os.path.exists(headers_path):
        os.remove(headers_path)


def _persist_headers_file(session_id: str, data: dict) -> str:
    session = get_session(session_id)
    if session:
        _cleanup_headers_file(session.get("headers_auth_path"))

    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        delete=False,
        prefix="mm_headers_",
        suffix=".json",
    ) as tmp:
        json.dump(data, tmp)
        return tmp.name


@router.post("/upload-headers")
async def upload_headers(request: Request, headers_file: UploadFile = File(...)):
    session_id = request.state.session_id
    content = await headers_file.read()

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    if "access_token" in data or "token_type" in data:
        raise HTTPException(
            status_code=400,
            detail="OAuth JSON files are not supported. Please use the 'Paste Cookie' method instead.",
        )
    if "Cookie" not in data:
        raise HTTPException(
            status_code=400,
            detail="Invalid file. Expected a browser headers JSON with a 'Cookie' field.",
        )

    headers_path = _persist_headers_file(session_id, data)

    set_session(session_id, "ytmusic_authenticated", True)
    set_session(session_id, "headers_auth_path", headers_path)

    return {"success": True}


def _compute_sapisidhash(sapisid: str, origin: str) -> str:
    ts = str(int(time.time()))
    h = sha1()
    h.update(f"{ts} {sapisid} {origin}".encode("utf-8"))
    return f"SAPISIDHASH {ts}_{h.hexdigest()}"


@router.post("/paste-cookies")
async def paste_cookies(request: Request, cookie: str = Body(..., embed=True)):
    """Accept a raw Cookie header string and build a valid ytmusicapi headers file."""
    session_id = request.state.session_id
    cookie = cookie.strip()
    if not cookie:
        raise HTTPException(status_code=400, detail="Cookie string is empty")

    # Parse cookie string manually — SimpleCookie chokes on __Secure-* names.
    cookie_pairs: dict[str, str] = {}
    for part in cookie.split(";"):
        part = part.strip()
        if "=" in part:
            key, _, value = part.partition("=")
            cookie_pairs[key.strip()] = value.strip()

    sapisid = cookie_pairs.get("__Secure-3PAPISID") or cookie_pairs.get("SAPISID")
    if not sapisid:
        raise HTTPException(
            status_code=400,
            detail=(
                "Cookie is missing '__Secure-3PAPISID'. "
                "Make sure you copied the full Cookie header value from a YouTube Music network request."
            ),
        )

    origin = "https://music.youtube.com"
    authorization = _compute_sapisidhash(sapisid, origin)

    headers_data = {
        "Cookie": cookie,
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Authorization": authorization,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        "X-Goog-AuthUser": "0",
        "x-origin": origin,
    }

    headers_path = _persist_headers_file(session_id, headers_data)

    set_session(session_id, "ytmusic_authenticated", True)
    set_session(session_id, "headers_auth_path", headers_path)

    return {"success": True}


@router.post("/spotify/config")
async def set_spotify_config(
    request: Request,
    client_id: str = Body(..., embed=True),
    client_secret: str = Body(..., embed=True),
):
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")

    cid = client_id.strip()
    csecret = client_secret.strip()
    if not cid or not csecret:
        raise HTTPException(status_code=400, detail="Client ID and Client Secret are required")

    set_session(session_id, "spotify_client_id", cid)
    set_session(session_id, "spotify_client_secret", csecret)
    # Force a fresh OAuth flow if credentials changed.
    set_session(session_id, "spotify_token_info", None)
    return {"success": True}


@router.get("/spotify/login")
async def spotify_login(request: Request):
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    client_id, client_secret = _resolve_spotify_app_credentials(session)
    sp_oauth = spotipy.oauth2.SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=_spotify_redirect_uri(),
        scope=SPOTIFY_SCOPE,
        cache_handler=MemoryCacheHandler(),
        open_browser=False,
        show_dialog=True,
    )
    auth_url = sp_oauth.get_authorize_url(state=session_id)
    return {"auth_url": auth_url, "redirect_uri": _spotify_redirect_uri()}


@router.get("/callback")
async def spotify_callback(request: Request, code: str, state: str | None = None):
    # Use state (session_id) passed through OAuth flow instead of relying on cookie,
    # since the callback URL (127.0.0.1:8000) may differ from the frontend domain (localhost)
    session_id = state if state else request.state.session_id
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Session not found")
    sp_oauth = get_oauth(session)
    token_info = sp_oauth.get_access_token(code, as_dict=True, check_cache=False)
    set_session(session_id, "spotify_token_info", token_info)
    return RedirectResponse(url=f"{settings.FRONTEND_URL}/library")


@router.get("/status")
async def auth_status(request: Request):
    session_id = request.state.session_id
    session = get_session(session_id)
    if not session:
        return {
            "spotify": False,
            "ytmusic": False,
            "spotify_configured": False,
            "spotify_redirect_uri": _spotify_redirect_uri(),
        }
    spotify_configured = bool(session.get("spotify_client_id") and session.get("spotify_client_secret"))
    return {
        "spotify": session.get("spotify_token_info") is not None,
        "ytmusic": session.get("ytmusic_authenticated", False),
        "spotify_configured": spotify_configured,
        "spotify_redirect_uri": _spotify_redirect_uri(),
    }


@router.post("/logout")
async def logout(request: Request):
    session_id = request.state.session_id
    session = get_session(session_id)
    if session:
        _cleanup_headers_file(session.get("headers_auth_path"))
        reset_session(session_id)
    return {"success": True}
