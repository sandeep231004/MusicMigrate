# MusicMigrate — Complete Build Plan

## 1. Repository & Tooling Setup

Initialize the repo as a monorepo with two workspaces. Use `uv` for Python, `npm` for JS.

```
musicmigrate/
├── backend/
├── frontend/
├── .env.example
├── .gitignore
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── docker-compose.yml
└── .github/
    └── workflows/
        └── ci.yml
```

**`.gitignore`** must exclude: `.env`, `__pycache__`, `*.pyc`, `node_modules`, `dist`, `headers_auth.json`, `.venv`

---

## 2. Backend — Complete Specification

### 2.1 Dependencies (`backend/pyproject.toml`)
```
fastapi
uvicorn[standard]
spotipy
ytmusicapi
python-dotenv
rapidfuzz
python-multipart
httpx
pydantic-settings
```

### 2.2 Directory Structure
```
backend/
├── pyproject.toml
├── main.py
├── config.py
├── models.py
├── session_store.py
├── routers/
│   ├── __init__.py
│   ├── auth.py
│   ├── youtube.py
│   └── spotify.py
└── services/
    ├── __init__.py
    ├── ytmusic_service.py
    ├── spotify_service.py
    └── matcher.py
```

### 2.3 `config.py`
- Use `pydantic-settings` `BaseSettings` class
- Load from `.env`: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI` defaults to `http://localhost:8000/auth/callback`
- `FRONTEND_URL` defaults to `http://localhost:5173`
- Export a singleton `settings` instance

### 2.4 `session_store.py`
- Simple in-memory dict-based session store (no database needed)
- Stores per-session: `spotify_token_info`, `ytmusic_authenticated` (bool), `headers_auth_path` (temp file path)
- Session ID generated as a UUID, stored in a cookie named `mm_session`
- Functions: `get_session(session_id)`, `set_session(session_id, key, value)`, `create_session()` → returns new session_id

### 2.5 `models.py` — All Pydantic schemas

```python
class Track:
    id: str | None         # Spotify track ID if matched
    title: str
    artist: str
    album: str | None
    duration_ms: int | None
    matched: bool
    ytmusic_video_id: str | None

class Playlist:
    id: str                # YTMusic playlist ID
    name: str
    description: str | None
    track_count: int
    thumbnail_url: str | None

class Album:
    id: str                # YTMusic album browse ID
    name: str
    artist: str
    year: str | None
    thumbnail_url: str | None

class TransferItem:
    type: Literal["playlist", "album"]
    id: str
    name: str

class TransferRequest:
    items: list[TransferItem]

class MatchCandidate:
    spotify_id: str
    title: str
    artist: str
    album: str
    duration_ms: int
    preview_url: str | None
    image_url: str | None

class UnmatchedTrack:
    playlist_id: str        # Spotify playlist ID this should go into
    playlist_name: str
    original_title: str
    original_artist: str

class TransferProgress:        # Sent via SSE
    event: str                 # "playlist_start" | "track_done" | "playlist_done" | "album_done" | "complete" | "error"
    item_name: str | None
    current: int | None
    total: int | None
    message: str | None

class ManualMatchRequest:
    spotify_track_id: str
    playlist_id: str           # Spotify playlist ID
```

### 2.6 `routers/auth.py`

**`POST /auth/upload-headers`**
- Accepts `multipart/form-data` with a file field named `headers_file`
- Validates the file is valid JSON with required ytmusicapi fields (`Cookie` key must exist)
- Saves to a temp file at `/tmp/mm_{session_id}_headers.json`
- Sets `session["ytmusic_authenticated"] = True`
- Returns `{ "success": true }`

**`GET /auth/spotify/login`**
- Creates a `spotipy.oauth2.SpotifyOAuth` instance using `settings.SPOTIFY_CLIENT_ID`, `settings.SPOTIFY_CLIENT_SECRET`, `settings.SPOTIFY_REDIRECT_URI`
- Scopes: `playlist-modify-public playlist-modify-private user-library-modify user-library-read`
- Returns `{ "auth_url": "<spotify_auth_url>" }`

**`GET /auth/callback`**
- Receives `code` query param from Spotify redirect
- Exchanges code for token using `SpotifyOAuth.get_access_token(code)`
- Stores full token info in session
- Redirects to `{FRONTEND_URL}/library`

**`GET /auth/status`**
- Returns `{ "spotify": bool, "ytmusic": bool }` based on session state

**`POST /auth/logout`**
- Clears session, deletes temp headers file if exists
- Returns `{ "success": true }`

### 2.7 `services/ytmusic_service.py`

- `get_client(headers_path: str) → YTMusic` — instantiate ytmusicapi with the headers file
- `get_playlists(headers_path: str) → list[Playlist]` — calls `get_library_playlists(limit=100)`, maps to `Playlist` model. Skip the auto-generated "Your Likes" playlist if present (it's handled separately).
- `get_playlist_tracks(headers_path: str, playlist_id: str) → list[Track]` — calls `get_playlist(playlist_id, limit=500)`, extracts `title`, `artists[0].name`, `album.name`, `duration_seconds * 1000`, `videoId`
- `get_library_albums(headers_path: str) → list[Album]` — calls `get_library_albums(limit=100)`, maps to `Album` model

### 2.8 `services/spotify_service.py`

- `get_client(token_info: dict) → Spotify` — instantiate `spotipy.Spotify(auth=token_info["access_token"])`
- `get_current_user_id(sp: Spotify) → str`
- `get_existing_playlists(sp: Spotify, user_id: str) → dict[str, str]` — returns `{ playlist_name: playlist_id }` for all user playlists (paginate through all pages)
- `create_playlist(sp: Spotify, user_id: str, name: str, description: str) → str` — returns new playlist ID
- `get_playlist_track_ids(sp: Spotify, playlist_id: str) → set[str]` — returns all existing Spotify track IDs in that playlist (paginate)
- `add_tracks_to_playlist(sp: Spotify, playlist_id: str, track_ids: list[str])` — batch into chunks of 100, call `sp.playlist_add_items` for each chunk, sleep 0.2s between chunks
- `search_track(sp: Spotify, title: str, artist: str) → list[MatchCandidate]` — search `track:{title} artist:{artist}`, return top 5 results as `MatchCandidate` list
- `search_album(sp: Spotify, name: str, artist: str) → str | None` — search `album:{name} artist:{artist}`, return first result's Spotify album ID or None
- `save_albums(sp: Spotify, album_ids: list[str])` — batch into chunks of 20, call `sp.current_user_saved_albums_add`, sleep 0.1s between chunks
- `get_saved_album_ids(sp: Spotify) → set[str]` — returns all currently saved album IDs (paginate)

### 2.9 `services/matcher.py`

- `match_track(sp: Spotify, title: str, artist: str) → tuple[str | None, float]`
  1. Call `spotify_service.search_track(sp, title, artist)`
  2. If results exist, compute `rapidfuzz.fuzz.token_sort_ratio` between `"{title} {artist}"` and each result's `"{title} {artist}"`
  3. If best score ≥ 80, return `(spotify_id, score)`
  4. If no results or score < 80, try a broader search: just `title` + `artist` separately, repeat scoring
  5. If still no match, return `(None, 0.0)`

### 2.10 `routers/youtube.py`

All routes require session with `ytmusic_authenticated == True`, else return 401.

**`GET /youtube/playlists`**
- Returns `list[Playlist]`

**`GET /youtube/albums`**
- Returns `list[Album]`

**`GET /youtube/playlist/{playlist_id}/tracks`**
- Returns `list[Track]` for that playlist

### 2.11 `routers/spotify.py`

All routes require session with valid `spotify_token_info`, else return 401. Refresh token automatically using `SpotifyOAuth.refresh_access_token` if expired before each call.

**`GET /spotify/search-track`**
- Query params: `title`, `artist`
- Returns `list[MatchCandidate]` (top 5 Spotify results)
- Used by the frontend search modal

**`POST /spotify/manual-match`**
- Body: `ManualMatchRequest`
- Fetches current track IDs in `playlist_id` to avoid duplicates
- Adds `spotify_track_id` to the Spotify playlist
- Returns `{ "success": true }`

**`GET /spotify/transfer`** — **Server-Sent Events (SSE) endpoint**

This is the core transfer endpoint. Accepts query param `items` as a JSON-encoded list of `TransferItem`.

Execution flow per item:

**For each playlist:**
1. Emit `{ event: "playlist_start", item_name: playlist.name, total: track_count }`
2. Fetch tracks from YTMusic via `ytmusic_service.get_playlist_tracks`
3. Look up existing Spotify playlists via `spotify_service.get_existing_playlists`
4. If playlist name exists → get its ID and fetch existing track IDs. If not → create new playlist, get its ID.
5. For each track:
   - Run `matcher.match_track`
   - If matched and not already in playlist → add to `to_add` list
   - If matched and already in playlist → skip (duplicate)
   - If not matched → add to `unmatched` list with playlist context
   - Emit `{ event: "track_done", item_name: track.title, current: i, total: total }`
6. Call `spotify_service.add_tracks_to_playlist` with `to_add` list
7. Emit `{ event: "playlist_done", item_name: playlist.name, message: f"{len(to_add)} added, {len(unmatched)} unmatched" }`

**For each album:**
1. Emit `{ event: "album_start", item_name: album.name }`
2. Search Spotify for album ID via `spotify_service.search_album`
3. Get already-saved album IDs
4. If found and not already saved → save it
5. Emit `{ event: "album_done", item_name: album.name, message: "saved" or "not found" or "already saved" }`

**At the end:**
- Store unmatched tracks list in session under `unmatched_tracks`
- Emit `{ event: "complete", message: f"{total_added} tracks added, {len(unmatched)} need review" }`
- Close SSE stream

**`GET /spotify/unmatched`**
- Returns the `unmatched_tracks` list stored in session after transfer

### 2.12 `main.py`
- Create FastAPI app with CORS middleware allowing `FRONTEND_URL`
- Mount all routers with prefixes: `/auth`, `/youtube`, `/spotify`
- Session middleware: read `mm_session` cookie on every request, inject session into request state, set cookie on response if new session
- Run with `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

---

## 3. Frontend — Complete Specification

### 3.1 Dependencies (`frontend/package.json`)
```
react, react-dom, react-router-dom
axios
@tanstack/react-query
lucide-react
tailwindcss, postcss, autoprefixer
```

### 3.2 Directory Structure
```
frontend/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js
    ├── pages/
    │   ├── Setup.jsx
    │   ├── Library.jsx
    │   ├── Transfer.jsx
    │   └── Results.jsx
    └── components/
        ├── PlaylistCard.jsx
        ├── AlbumCard.jsx
        ├── TrackRow.jsx
        ├── ProgressBar.jsx
        ├── SearchModal.jsx
        └── StatusBadge.jsx
```

### 3.3 `vite.config.js`
- Proxy all `/auth`, `/youtube`, `/spotify` requests to `http://localhost:8000`

### 3.4 `api.js`
Axios instance with `baseURL: ""` (uses Vite proxy), `withCredentials: true`.

Export functions:
- `getAuthStatus()` → `GET /auth/status`
- `uploadHeaders(file)` → `POST /auth/upload-headers` with FormData
- `getSpotifyLoginUrl()` → `GET /auth/spotify/login`
- `getPlaylists()` → `GET /youtube/playlists`
- `getAlbums()` → `GET /youtube/albums`
- `getUnmatched()` → `GET /spotify/unmatched`
- `searchTrack(title, artist)` → `GET /spotify/search-track?title=&artist=`
- `manualMatch(spotifyTrackId, playlistId)` → `POST /spotify/manual-match`
- `createTransferEventSource(items)` → returns `new EventSource("/spotify/transfer?items=" + encodeURIComponent(JSON.stringify(items)))`

### 3.5 `App.jsx`
- `react-router-dom` with routes: `/` → Setup, `/library` → Library, `/transfer` → Transfer, `/results` → Results
- On mount, call `getAuthStatus()`. If both auth flags are true, redirect `/` to `/library`

### 3.6 `pages/Setup.jsx` — Step 1

**Layout:** Centered card, two-section vertical layout.

**Section A — YouTube Music:**
- Heading: "Connect YouTube Music"
- Instructions text: "Export your browser cookies using the ytmusicapi format. Open YouTube Music in your browser, open DevTools → Network tab, find a request to music.youtube.com, right-click → Copy → Copy as cURL, then run `ytmusicapi browser` in terminal and paste."
- Link to ytmusicapi docs
- File upload input (`.json` only) labeled "Upload headers_auth.json"
- On file select → call `uploadHeaders(file)` → show green checkmark on success or red error message on failure

**Section B — Spotify:**
- Heading: "Connect Spotify"
- Text: "You need a free Spotify Developer account. Go to developer.spotify.com, create an app, add `http://localhost:8000/auth/callback` as a Redirect URI, then copy your Client ID and Secret into a `.env` file in the backend directory."
- Show `.env` format: `SPOTIFY_CLIENT_ID=xxx` / `SPOTIFY_CLIENT_SECRET=xxx`
- Button "Connect Spotify Account" → calls `getSpotifyLoginUrl()` → redirects `window.location.href` to the returned URL
- If Spotify already authenticated (from `getAuthStatus`), show green "Connected" badge instead

**Bottom:** "Continue to Library →" button, disabled until both `ytmusic: true` and `spotify: true` from auth status polling (poll every 2 seconds). On click → navigate to `/library`.

### 3.7 `pages/Library.jsx` — Step 2

- On mount: fetch playlists and albums in parallel via `getPlaylists()` and `getAlbums()`
- Show loading spinner while fetching
- Two tabs: "Playlists" and "Albums"
- Each tab shows a grid of cards (`PlaylistCard` / `AlbumCard`)
- Each card has a checkbox. "Select All" / "Deselect All" button per tab.
- Selected count shown: "X playlists, Y albums selected"
- "Start Transfer →" button at bottom, disabled if nothing selected
- On click → navigate to `/transfer` passing selected items via `react-router-dom` state

**`PlaylistCard.jsx`:** thumbnail, playlist name, track count, checkbox overlay on selection

**`AlbumCard.jsx`:** thumbnail, album name, artist name, year, checkbox overlay

### 3.8 `pages/Transfer.jsx` — Step 3

- On mount: read selected items from router state. If none, redirect to `/library`.
- Call `createTransferEventSource(items)` to open SSE connection
- Show overall progress bar: completed items / total items
- Show currently-processing item with its own track-level progress bar
- Log feed below: scrolling list of completed events with icons (✓ green for success, ✗ red for unmatched, → grey for skipped duplicate)
- Handle SSE events:
  - `playlist_start` → set current item name, reset track progress
  - `track_done` → update track progress bar
  - `playlist_done` → mark item complete, add to log
  - `album_start` → set current item
  - `album_done` → mark complete, add to log
  - `complete` → close EventSource, show "Transfer Complete!" with summary message, show "Review Unmatched Songs →" button (navigate to `/results`) and "Back to Library" button
  - `error` → show red error banner with message

### 3.9 `pages/Results.jsx` — Step 4

- On mount: call `getUnmatched()` to fetch unmatched tracks
- If empty: show "🎉 All tracks were matched!" with a "Done" button back to `/library`
- Show a table with columns: Track Title | Artist | Playlist | Actions
- Each row has a "Find on Spotify" button → opens `SearchModal`
- Once a track is manually matched → show green "✓ Added" in that row's Actions column
- Show count: "X of Y tracks resolved"

**`SearchModal.jsx`:**
- Props: `track` (title + artist), `playlistId`, `onMatch()`
- Search input pre-filled with `"{title} {artist}"`
- On open → auto-call `searchTrack(title, artist)` and show results
- User can edit search query and re-search
- Each result shows: album art, track name, artist, album, duration
- "Add this track" button per result → calls `manualMatch(spotifyTrackId, playlistId)` → closes modal → calls `onMatch()`

### 3.10 `components/ProgressBar.jsx`
- Props: `current`, `total`, `label`
- Tailwind-styled, animated fill, shows percentage text

---

## 4. Configuration Files

### `.env.example`
```
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:8000/auth/callback
FRONTEND_URL=http://localhost:5173
```

### `docker-compose.yml`
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    volumes: ["/tmp:/tmp"]
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]
```

Each service needs a `Dockerfile`. Backend: `python:3.12-slim`, install with `uv`, run `uvicorn`. Frontend: `node:20-alpine`, `npm install`, `npm run dev -- --host`.

---

## 5. README.md — Required Sections

1. **What is MusicMigrate** — one paragraph
2. **Prerequisites** — Python 3.12+, Node 20+, Spotify Developer account
3. **Getting Spotify Credentials** — exact steps: create app at developer.spotify.com, set redirect URI to `http://localhost:8000/auth/callback`, copy Client ID and Secret
4. **Getting YouTube Music Cookies** — exact steps: install ytmusicapi (`pip install ytmusicapi`), run `ytmusicapi browser`, paste cURL, save as `headers_auth.json`
5. **Installation & Running** — clone repo, copy `.env.example` to `.env`, fill in credentials, `cd backend && uv sync && uv run uvicorn main:app --reload`, `cd frontend && npm install && npm run dev`
6. **Running with Docker** — `docker-compose up --build`
7. **Limitations** — YTMusic API is unofficial; songs not on Spotify can't be transferred; cookie auth may expire
8. **Contributing** — link to CONTRIBUTING.md

---

## 6. CI (`github/workflows/ci.yml`)

- Trigger: push and pull_request on `main`
- Backend job: `uv sync`, run `ruff check .` (linting), `mypy .` (type check)
- Frontend job: `npm install`, run `npm run lint` (eslint)

---

## 7. Build Order for Claude Code

Execute in this exact order to avoid dependency issues:

1. Create root scaffold: `.gitignore`, `.env.example`, `LICENSE` (MIT), `docker-compose.yml`
2. Build `backend/` fully: `pyproject.toml` → `config.py` → `models.py` → `session_store.py` → all services → all routers → `main.py`
3. Build `frontend/` fully: `package.json` → `vite.config.js` → `tailwind.config.js` → `api.js` → all components → all pages → `App.jsx` → `main.jsx`
4. Write `README.md`, `CONTRIBUTING.md`
5. Write `.github/workflows/ci.yml`
6. Verify: `uv run ruff check backend/` and `cd frontend && npm run lint` should both pass with zero errors