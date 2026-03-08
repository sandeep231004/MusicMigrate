from typing import Literal
from pydantic import BaseModel


class Track(BaseModel):
    id: str | None = None
    title: str
    artist: str
    album: str | None = None
    duration_ms: int | None = None
    matched: bool = False
    ytmusic_video_id: str | None = None


class Playlist(BaseModel):
    id: str
    name: str
    description: str | None = None
    track_count: int
    thumbnail_url: str | None = None


class Album(BaseModel):
    id: str
    name: str
    artist: str
    year: str | None = None
    thumbnail_url: str | None = None


class TransferItem(BaseModel):
    type: Literal["playlist", "album"]
    id: str
    name: str
    artist: str | None = None  # used for album searches


class TransferRequest(BaseModel):
    items: list[TransferItem]


class MatchCandidate(BaseModel):
    spotify_id: str
    title: str
    artist: str
    album: str
    duration_ms: int
    preview_url: str | None = None
    image_url: str | None = None


class UnmatchedTrack(BaseModel):
    playlist_id: str
    playlist_name: str
    original_title: str
    original_artist: str


class TransferProgress(BaseModel):
    event: str
    item_name: str | None = None
    current: int | None = None
    total: int | None = None
    message: str | None = None


class ManualMatchRequest(BaseModel):
    spotify_track_id: str
    playlist_id: str
