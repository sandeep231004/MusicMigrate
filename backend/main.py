from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from config import settings
from routers import auth, spotify, youtube
from session_store import create_session, get_session


def _build_allowed_origins() -> list[str]:
    origins: set[str] = set()
    if settings.FRONTEND_URL:
        origins.add(settings.FRONTEND_URL.strip())
    if settings.FRONTEND_URLS:
        for origin in settings.FRONTEND_URLS.split(","):
            cleaned = origin.strip()
            if cleaned:
                origins.add(cleaned)
    return sorted(origins)


class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        session_id = request.cookies.get("mm_session")
        if not session_id or get_session(session_id) is None:
            session_id = create_session()
            request.state.session_id = session_id
            response = await call_next(request)
            # Cross-domain (Vercel→Railway) requires SameSite=None + Secure.
            # Local dev uses SameSite=Lax (no HTTPS needed).
            response.set_cookie(
                "mm_session",
                session_id,
                httponly=True,
                samesite="none" if settings.is_production else "lax",
                secure=settings.is_production,
                max_age=86400 * 7,
            )
            return response
        request.state.session_id = session_id
        return await call_next(request)


app = FastAPI(title="MusicMigrate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_build_allowed_origins(),
    allow_origin_regex=(settings.FRONTEND_ORIGIN_REGEX or None),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware)

app.include_router(auth.router, prefix="/auth")
app.include_router(youtube.router, prefix="/youtube")
app.include_router(spotify.router, prefix="/spotify")
