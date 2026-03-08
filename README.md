# MusicMigrate

MusicMigrate is built to minimize manual playlist transfer work from YouTube Music to Spotify.
It automates matching and transfer while still allowing manual review when needed.
It runs locally on your machine using FastAPI + React.

## Features

- Transfer YouTube Music playlists to Spotify playlists.
- Save YouTube Music library albums to Spotify saved albums.
- Automatic fuzzy matching with manual review for unmatched tracks.
- Real-time transfer progress via server-sent events (SSE).
- Per-user Spotify app credentials from the Setup page (open-source friendly).
- Local session persistence in `backend/.runtime/sessions.json`.

## Requirements

- Python 3.12+
- Node.js 18+
- `uv` for backend dependency management
- Spotify Premium account (required for playlist write operations via Spotify Web API)

## Quick Start

1. Clone the repository.

```bash
git clone https://github.com/sandeep231004/MusicMigrate.git
cd MusicMigrate
```

2. Prepare backend environment.

```bash
cp .env.example backend/.env
```

3. Start backend.

```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

4. Start frontend in a new terminal.

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://127.0.0.1:8000`

## Spotify Setup (Required Per User)

Each user should use their own Spotify Developer app:

1. Open <https://developer.spotify.com/dashboard>.
2. Create an app.
3. Add this Redirect URI exactly:

```text
http://127.0.0.1:8000/auth/callback
```

4. Copy Client ID and Client Secret.
5. Enter them on the app Setup page before clicking Connect to Spotify.
6. Sign in with the same Spotify account and approve access.

Important:

- Spotify account must be Premium.
- Credentials are not read from `.env` for user login flow.
- Every user must provide their own credentials in UI.

## YouTube Music Setup

1. Open <https://music.youtube.com> and sign in.
2. Open DevTools (`F12`) and go to the **Network** tab.
3. Refresh the page.
4. Click any request to `music.youtube.com` (for example a URL containing `/youtubei/v1/`).
5. In **Headers** -> **Request Headers**, find `cookie`.
6. Copy only the cookie value and paste it in Setup, then click **Connect YouTube Music**.

Important:

- Do not include the `cookie:` label, only the value.
- Keep the full `key=value; key=value; ...` string.
- The cookie must include `__Secure-3PAPISID` (or `SAPISID`).

## Configuration

`backend/.env` supports:

- `SPOTIFY_REDIRECT_URI` (default: `http://127.0.0.1:8000/auth/callback`)
- `FRONTEND_URL` (default: `http://localhost:5173`)

If your frontend runs on another port, update `FRONTEND_URL`.

## Project Structure

```text
backend/
  main.py
  config.py
  session_store.py
  routers/
  services/
frontend/
  src/
    pages/
    components/
```

## Troubleshooting

- `Spotify not authenticated`: reconnect Spotify from Setup.
- `Spotify app credentials not configured`: enter Client ID and Client Secret in Setup.
- `YouTube Music not authenticated`: refresh and paste new cookies.
- `Cookie is missing '__Secure-3PAPISID'`: copy the full cookie from a `music.youtube.com` network request while signed in.
- Spotify callback redirect mismatch: check `FRONTEND_URL` in `backend/.env`.
- Transfer errors: inspect backend terminal logs first.

## Contributing

Pull requests, bug reports, and suggestions are welcome.  
If you have ideas for new features or improvements, open an issue or PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT
