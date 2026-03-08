import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true,
})

export const getAuthStatus = () => api.get('/auth/status').then((r) => r.data)

export const uploadHeaders = (file) => {
  const form = new FormData()
  form.append('headers_file', file)
  return api.post('/auth/upload-headers', form).then((r) => r.data)
}

export const pasteCookies = (cookie) =>
  api.post('/auth/paste-cookies', { cookie }).then((r) => r.data)

export const setSpotifyConfig = (clientId, clientSecret) =>
  api
    .post('/auth/spotify/config', { client_id: clientId, client_secret: clientSecret })
    .then((r) => r.data)

export const getSpotifyLoginUrl = () => api.get('/auth/spotify/login').then((r) => r.data)

export const logout = () => api.post('/auth/logout').then((r) => r.data)

export const getPlaylists = () => api.get('/youtube/playlists').then((r) => r.data)

export const getAlbums = () => api.get('/youtube/albums').then((r) => r.data)

export const getUnmatched = () => api.get('/spotify/unmatched').then((r) => r.data)

export const searchTrack = (title, artist) =>
  api.get('/spotify/search-track', { params: { title, artist } }).then((r) => r.data)

export const manualMatch = (spotifyTrackId, playlistId) =>
  api
    .post('/spotify/manual-match', {
      spotify_track_id: spotifyTrackId,
      playlist_id: playlistId,
    })
    .then((r) => r.data)

export const createTransferEventSource = (items) =>
  new EventSource(
    '/spotify/transfer?items=' + encodeURIComponent(JSON.stringify(items)),
    { withCredentials: true },
  )
