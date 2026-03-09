import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Youtube, LogOut } from 'lucide-react'
import {
  pasteCookies,
  setSpotifyConfig,
  getSpotifyLoginUrl,
  logout,
} from '../api.js'
import StatusBadge from '../components/StatusBadge.jsx'

export default function Setup({ authStatus }) {
  const navigate = useNavigate()
  const spotifyRedirectUri =
    authStatus?.spotify_redirect_uri || 'https://musicmigrate-production.up.railway.app/auth/callback'
  const [ytState, setYtState] = useState('idle')
  const [ytError, setYtError] = useState('')
  const [cookieText, setCookieText] = useState('')
  const [spotifyClientId, setSpotifyClientId] = useState('')
  const [spotifyClientSecret, setSpotifyClientSecret] = useState('')
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const [spotifyError, setSpotifyError] = useState('')

  const handlePasteCookies = async () => {
    if (!cookieText.trim()) return
    setYtState('loading')
    try {
      await pasteCookies(cookieText.trim())
      setYtState('success')
    } catch (err) {
      setYtState('error')
      setYtError(err.response?.data?.detail || 'Failed. Make sure you copied the full Cookie value.')
    }
  }

  const handleSpotifyLogin = async () => {
    setSpotifyError('')

    const cid = spotifyClientId.trim()
    const csecret = spotifyClientSecret.trim()
    if (!authStatus?.spotify && (!cid || !csecret)) {
      setSpotifyError('Enter your Spotify Client ID and Client Secret first.')
      return
    }

    setSpotifyLoading(true)
    try {
      if (cid && csecret) {
        await setSpotifyConfig(cid, csecret)
      }
      const data = await getSpotifyLoginUrl()
      window.location.href = data.auth_url
    } catch (err) {
      setSpotifyLoading(false)
      setSpotifyError(err.response?.data?.detail || 'Spotify login failed.')
    }
  }

  const bothConnected = authStatus?.spotify && authStatus?.ytmusic

  return (
    <div className="flex flex-col items-center justify-center -mt-8">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-2">
            Welcome to MusicMigrate
          </h1>
          <p className="text-lg text-gray-400">
            Minimize manual playlist transfer from YouTube Music to Spotify.
          </p>
          {(authStatus?.spotify || authStatus?.ytmusic) && (
            <button
              onClick={async () => { await logout(); window.location.reload() }}
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Reset Connection
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* YouTube Music Card */}
          <div className="glass-panel p-8 rounded-2xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-800 rounded-xl border border-gray-700 shadow-sm">
                  <Youtube className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white/90">YouTube Music</h2>
                  <p className="text-sm text-gray-400">Source library</p>
                </div>
              </div>
              <StatusBadge
                connected={authStatus?.ytmusic}
                label={authStatus?.ytmusic ? 'Connected' : 'Not connected'}
              />
            </div>

            {authStatus?.ytmusic ? (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-gray-300 text-sm">Your YouTube Music account is successfully linked and ready to read your library.</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="space-y-4">
                  <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 text-sm text-gray-300">
                    <p className="font-medium text-white mb-2">How to copy the Cookie value:</p>
                    <ol className="list-decimal list-outside ml-4 space-y-1.5 marker:text-gray-500">
                      <li>Open <a href="https://music.youtube.com" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline font-medium">music.youtube.com</a> and make sure you are signed in.</li>
                      <li>Press <kbd className="bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded text-xs font-mono text-gray-400">F12</kbd>, open the <strong>Network</strong> tab, then refresh the page.</li>
                      <li>Click a request to <span className="text-white">music.youtube.com</span> (for example one with <code className="text-gray-200 font-mono text-xs">/youtubei/v1/</code> in the URL).</li>
                      <li>Go to <strong>Headers</strong> and find <strong>Request Headers</strong> -&gt; <code className="text-red-400 font-mono text-xs bg-gray-950 px-1 py-0.5 rounded">cookie</code>.</li>
                      <li>Copy only the header value and paste it below. Do not include the <code className="text-red-400 font-mono text-xs bg-gray-950 px-1 py-0.5 rounded">cookie:</code> label.</li>
                    </ol>
                    <p className="mt-3 text-xs text-gray-400">
                      The value should be a long <code className="bg-gray-900 border border-gray-700 px-1 py-0.5 rounded font-mono">key=value; key=value; ...</code> string and must include <code className="bg-gray-900 border border-gray-700 px-1 py-0.5 rounded font-mono">__Secure-3PAPISID</code>.
                    </p>
                  </div>
                  
                    <textarea
                      value={cookieText}
                      onChange={(e) => setCookieText(e.target.value)}
                      placeholder="Paste full cookie value here (e.g. VISITOR_INFO1_LIVE=...; __Secure-3PAPISID=...)"
                      rows={3}
                      className="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-shadow font-mono resize-none overflow-hidden"
                    />
                  
                  <button
                    onClick={handlePasteCookies}
                    disabled={!cookieText.trim() || ytState === 'loading'}
                    className="w-full sm:w-auto bg-gray-100 text-gray-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98]"
                  >
                    {ytState === 'loading' ? 'Connecting...' : 'Connect YouTube Music'}
                  </button>
                </div>

                {ytState === 'error' && (
                  <p className="mt-4 text-red-400 text-sm flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <span className="shrink-0">!</span> {ytError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Spotify Card */}
          <div className="glass-panel p-8 rounded-2xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500/80"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gray-800 rounded-xl border border-gray-700 shadow-sm">
                  <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-white/90">Spotify</h2>
                  <p className="text-sm text-gray-400">Destination account</p>
                </div>
              </div>
              <StatusBadge
                connected={authStatus?.spotify}
                label={authStatus?.spotify ? 'Connected' : 'Not connected'}
              />
            </div>

            {authStatus?.spotify ? (
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <p className="text-gray-300 text-sm">Your Spotify account is successfully linked and ready to receive playlists.</p>
              </div>
            ) : (
              <div className="animate-fade-in space-y-5">
                <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50 text-sm text-gray-300">
                  <p>In order to create playlists, you must create a free Spotify Developer app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline font-medium">developer.spotify.com</a>.</p>
                  <p className="mt-2 text-gray-400">Set the Redirect URI to <code className="bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded font-mono text-xs">{spotifyRedirectUri}</code>.</p>
                  <p className="mt-2 text-gray-400">Your Spotify account must be Premium for playlist write access.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Client ID</label>
                    <input
                      value={spotifyClientId}
                      onChange={(e) => setSpotifyClientId(e.target.value)}
                      placeholder="Client ID..."
                      className="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-shadow font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Client Secret</label>
                    <input
                      type="password"
                      value={spotifyClientSecret}
                      onChange={(e) => setSpotifyClientSecret(e.target.value)}
                      placeholder="Client Secret..."
                      className="w-full bg-gray-950/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-shadow font-mono"
                    />
                  </div>
                </div>

                {spotifyError && (
                  <p className="text-red-400 text-sm flex items-center gap-2 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <span className="shrink-0">!</span> {spotifyError}
                  </p>
                )}

                <button
                  onClick={handleSpotifyLogin}
                  disabled={spotifyLoading}
                  className="w-full sm:w-auto bg-green-500 text-gray-950 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-[0.98] focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900"
                >
                  {spotifyLoading ? 'Redirecting...' : 'Connect to Spotify'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Bottom */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={() => navigate('/library')}
            disabled={!bothConnected}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 py-3.5 px-10 rounded-xl text-base font-bold transition-all duration-300 shadow-lg ${
              bothConnected 
                ? 'bg-white text-gray-950 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
            }`}
          >
            Go to Library
            <svg className={`w-5 h-5 transition-transform duration-300 ${bothConnected ? 'translate-x-1' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>

      </div>
    </div>
  )
}
