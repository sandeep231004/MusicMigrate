import json
import threading
import uuid
from pathlib import Path
from typing import Any

SESSION_FILE = Path(__file__).resolve().parent / ".runtime" / "sessions.json"
_SESSION_LOCK = threading.Lock()


def _new_session_payload() -> dict[str, Any]:
    return {
        "spotify_client_id": None,
        "spotify_client_secret": None,
        "spotify_token_info": None,
        "ytmusic_authenticated": False,
        "headers_auth_path": None,
        "unmatched_tracks": [],
    }


def _load_sessions() -> dict[str, dict[str, Any]]:
    if not SESSION_FILE.exists():
        return {}

    try:
        with open(SESSION_FILE, encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, json.JSONDecodeError):
        return {}

    if not isinstance(raw, dict):
        return {}

    sessions: dict[str, dict[str, Any]] = {}
    for session_id, payload in raw.items():
        if isinstance(session_id, str) and isinstance(payload, dict):
            sessions[session_id] = payload
    return sessions


def _save_sessions() -> None:
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SESSION_FILE, "w", encoding="utf-8") as f:
        json.dump(_sessions, f)


_sessions: dict[str, dict[str, Any]] = _load_sessions()


def create_session() -> str:
    session_id = str(uuid.uuid4())
    with _SESSION_LOCK:
        _sessions[session_id] = _new_session_payload()
        _save_sessions()
    return session_id


def get_session(session_id: str) -> dict[str, Any] | None:
    with _SESSION_LOCK:
        session = _sessions.get(session_id)
        return dict(session) if session is not None else None


def set_session(session_id: str, key: str, value: Any) -> None:
    with _SESSION_LOCK:
        if session_id in _sessions:
            _sessions[session_id][key] = value
            _save_sessions()


def reset_session(session_id: str) -> None:
    with _SESSION_LOCK:
        if session_id in _sessions:
            _sessions[session_id] = _new_session_payload()
            _save_sessions()


def delete_session(session_id: str) -> None:
    with _SESSION_LOCK:
        _sessions.pop(session_id, None)
        _save_sessions()
