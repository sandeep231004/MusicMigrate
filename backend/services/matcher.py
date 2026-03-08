import spotipy
from rapidfuzz import fuzz

from models import MatchCandidate
from services import spotify_service


def match_track(
    sp: spotipy.Spotify, title: str, artist: str
) -> tuple[str | None, float]:
    query_str = f"{title} {artist}".lower()

    # First: structured field query
    candidates = spotify_service.search_track(sp, title, artist)
    best_id, best_score = _score_candidates(candidates, query_str)
    if best_score >= 80:
        return best_id, best_score

    # Fallback: broad free-text query
    fallback = spotify_service.search_track_broad(sp, title, artist)
    best_id, best_score = _score_candidates(fallback, query_str)
    if best_score >= 80:
        return best_id, best_score

    return None, 0.0


def _score_candidates(
    candidates: list[MatchCandidate], query_str: str
) -> tuple[str | None, float]:
    best_id: str | None = None
    best_score = 0.0
    for c in candidates:
        candidate_str = f"{c.title} {c.artist}".lower()
        score = float(fuzz.token_sort_ratio(query_str, candidate_str))
        if score > best_score:
            best_score = score
            best_id = c.spotify_id
    return best_id, best_score
