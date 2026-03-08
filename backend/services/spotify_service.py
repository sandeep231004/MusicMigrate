import time

import spotipy
from spotipy.exceptions import SpotifyException

from models import MatchCandidate


def get_client(token_info: dict) -> spotipy.Spotify:
    return spotipy.Spotify(auth=token_info["access_token"])


def get_current_user_id(sp: spotipy.Spotify) -> str:
    return sp.current_user()["id"]


def get_existing_playlists(sp: spotipy.Spotify, user_id: str) -> dict[str, str]:
    playlists: dict[str, str] = {}
    results = sp.current_user_playlists(limit=50)
    while results:
        for p in results["items"]:
            if p and p.get("owner", {}).get("id") == user_id:
                playlists[p["name"]] = p["id"]
        results = sp.next(results) if results.get("next") else None
    return playlists


def create_playlist(sp: spotipy.Spotify, name: str, description: str) -> str:
    try:
        # Use the non-deprecated "me/playlists" endpoint for the authenticated user.
        result = sp.current_user_playlist_create(name, public=False, description=description)
        return result["id"]
    except SpotifyException as e:
        if e.http_status == 403:
            raise PermissionError(
                "Spotify rejected playlist creation (403). Reconnect Spotify and verify the app has "
                "'playlist-modify-private' scope. If your Spotify app is in Development mode, add your "
                "Spotify account under Dashboard > Users and access."
            ) from e
        raise


def get_playlist_track_ids(sp: spotipy.Spotify, playlist_id: str) -> set[str]:
    track_ids: set[str] = set()
    results = sp.playlist_items(playlist_id, fields="items.track.id,next", limit=100)
    while results:
        for item in results["items"]:
            track = item.get("track")
            if track and track.get("id"):
                track_ids.add(track["id"])
        results = sp.next(results) if results.get("next") else None
    return track_ids


def add_tracks_to_playlist(
    sp: spotipy.Spotify, playlist_id: str, track_ids: list[str]
) -> None:
    for i in range(0, len(track_ids), 100):
        chunk = track_ids[i : i + 100]
        uris = [f"spotify:track:{tid}" for tid in chunk]
        sp.playlist_add_items(playlist_id, uris)
        time.sleep(0.2)


def search_track(
    sp: spotipy.Spotify, title: str, artist: str
) -> list[MatchCandidate]:
    query = f"track:{title} artist:{artist}"
    results = sp.search(query, type="track", limit=5)
    return _parse_track_results(results)


def search_track_broad(
    sp: spotipy.Spotify, title: str, artist: str
) -> list[MatchCandidate]:
    query = f"{title} {artist}"
    results = sp.search(query, type="track", limit=5)
    return _parse_track_results(results)


def _parse_track_results(results: dict) -> list[MatchCandidate]:
    candidates = []
    for item in results.get("tracks", {}).get("items", []):
        album = item.get("album", {})
        images = album.get("images", [])
        image_url = images[0]["url"] if images else None
        artists = item.get("artists", [])
        artist_name = artists[0]["name"] if artists else ""
        candidates.append(
            MatchCandidate(
                spotify_id=item["id"],
                title=item["name"],
                artist=artist_name,
                album=album.get("name", ""),
                duration_ms=item.get("duration_ms", 0),
                preview_url=item.get("preview_url"),
                image_url=image_url,
            )
        )
    return candidates


def search_album(sp: spotipy.Spotify, name: str, artist: str) -> str | None:
    query = f"album:{name} artist:{artist}" if artist else f"album:{name}"
    results = sp.search(query, type="album", limit=1)
    items = results.get("albums", {}).get("items", [])
    return items[0]["id"] if items else None


def save_albums(sp: spotipy.Spotify, album_ids: list[str]) -> None:
    for i in range(0, len(album_ids), 20):
        chunk = album_ids[i : i + 20]
        sp.current_user_saved_albums_add(chunk)
        time.sleep(0.1)


def get_saved_album_ids(sp: spotipy.Spotify) -> set[str]:
    album_ids: set[str] = set()
    results = sp.current_user_saved_albums(limit=50)
    while results:
        for item in results["items"]:
            album = item.get("album", {})
            if album.get("id"):
                album_ids.add(album["id"])
        results = sp.next(results) if results.get("next") else None
    return album_ids
