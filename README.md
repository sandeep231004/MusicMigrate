# MusicMigrate

MusicMigrate minimizes manual transfer work from YouTube Music to Spotify.
It migrates playlists and albums using metadata matching, then gives manual review for unmatched tracks where you can search and add songs directly to Spotify.

## What It Does

- Transfers YouTube Music playlists to Spotify playlists.
- Saves YouTube Music library albums to Spotify saved albums.
- Uses fuzzy matching for track search and duplicate-safe adds.
- Streams real-time transfer progress to the UI.
- Supports user-owned Spotify app credentials (open-source friendly).

## Requirements

- Python 3.12+
- Node.js 18+
- `uv` for backend dependency management
- Spotify Premium account (required for playlist write operations)

## Local Development

1. Clone the repo.

```bash
git clone https://github.com/sandeep231004/MusicMigrate.git
cd MusicMigrate
```

2. Create backend env file.

```bash
cp .env.example backend/.env
```

3. Start backend.

```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

4. Start frontend in another terminal.

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://127.0.0.1:8000`

## How to Use MusicMigrate

1. Open MusicMigrate in your browser.
2. Complete authentication for YouTube Music and Spotify.
3. Go to Library, select playlists/albums, and start transfer.

## Authentication

### Spotify Authentication

1. Open <https://developer.spotify.com/dashboard>.
2. Create your own Spotify Developer app.
3. Add this Redirect URI exactly:

```text
https://musicmigrate-production.up.railway.app/auth/callback
```

4. Copy that app's Client ID and Client Secret.
5. Paste them in Setup and click **Connect to Spotify**.
6. Approve access on Spotify.

Notes:

- Redirect URI must match exactly (scheme, host, path, and trailing slash behavior).
- Every user must add this callback URI in their own Spotify app dashboard.
- Credentials are entered per-user in the UI (not shared through `.env`).
- For local development, use `http://127.0.0.1:8000/auth/callback` instead.

### YouTube Music Authentication (Cookie Method)

1. Open <https://music.youtube.com> and sign in.
2. Open DevTools (`F12`) -> **Network**.
3. Refresh the page.
4. Click a request to `music.youtube.com` (for example with `/youtubei/v1/` in URL).
5. In **Headers** -> **Request Headers**, find `cookie`.
6. Copy only the cookie value and paste it in Setup.

Rules:

- Do not include `cookie:` label, only the value.
- Keep the full `key=value; key=value; ...` string.
- It must include `__Secure-3PAPISID` (or `SAPISID`).

## Transfer Logic (High Level)

- For each selected playlist/album, backend fetches source metadata from YouTube Music.
- For playlists, each track is searched on Spotify using strict query first, then broad query fallback.
- Fuzzy score threshold decides auto-match vs unmatched bucket.
- Matched tracks are added in batches, skipping tracks already present.
- Unmatched tracks are saved for manual matching in the UI.

## Configuration Reference

`backend/.env` (copy from `.env.example`):

| Variable | Description | Example |
|----------|-------------|---------|
| `ENVIRONMENT` | `development` or `production` | `development` |
| `SPOTIFY_REDIRECT_URI` | Must match Spotify app dashboard | `http://127.0.0.1:8000/auth/callback` |
| `FRONTEND_URL` | Frontend origin for post-auth redirect | `http://localhost:5173` |
| `FRONTEND_URLS` | Comma-separated allowed CORS origins | `http://localhost:5173,http://127.0.0.1:5173` |

## Troubleshooting

- `INVALID_CLIENT: Invalid redirect URI`:
  - Confirm the Redirect URI in your Spotify app dashboard matches your backend URL exactly.
    Hosted: `https://musicmigrate-production.up.railway.app/auth/callback`
    Local: `http://127.0.0.1:8000/auth/callback`
- `Spotify app credentials not configured`:
  - Enter Client ID and Client Secret in Setup before Connect.
- `YouTube Music not authenticated`:
  - Recopy cookie from a fresh signed-in request.
- `Cookie is missing '__Secure-3PAPISID'`:
  - You copied an incomplete cookie value; copy full Request Headers cookie.
- Transfer hangs or errors:
  - Check backend logs first (`/spotify/transfer` stream events and exceptions).

## Contributing

Pull requests, bug reports, and suggestions are welcome.
If you have ideas for new features or improvements, open an issue or PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

**MIT**
