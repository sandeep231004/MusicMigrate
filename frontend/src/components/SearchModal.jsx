import { useState, useEffect } from 'react'
import { X, Music, Search, Loader2 } from 'lucide-react'
import { searchTrack, manualMatch } from '../api.js'

function formatDuration(ms) {
  if (!ms) return '--:--'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function SearchModal({ track, playlistId, onMatch, onClose }) {
  const [query, setQuery] = useState(`${track.original_title} ${track.original_artist}`)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(null)

  const doSearch = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const words = q.trim().split(' ')
      const half = Math.ceil(words.length / 2)
      const title = words.slice(0, half).join(' ')
      const artist = words.slice(half).join(' ')
      const data = await searchTrack(title || q, artist || '')
      setResults(data)
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Esc key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)

    // Use the original separated fields for the initial search for best accuracy
    searchTrack(track.original_title, track.original_artist)
      .then(setResults)
      .catch(() => setError('Search failed. Please try again.'))
      
    return () => window.removeEventListener('keydown', handleEsc)
  }, [track.original_title, track.original_artist, onClose])

  const handleAdd = async (spotifyId) => {
    setAdding(spotifyId)
    try {
      await manualMatch(spotifyId, playlistId)
      onMatch()
      onClose()
    } catch {
      setError('Failed to add track. Please try again.')
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
      <div className="bg-gray-900 border border-white/[0.1] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.05] bg-gray-900/50">
          <div>
             <h2 className="font-bold text-xl text-white tracking-tight">Search Spotify</h2>
             <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
               Looking for: <span className="text-white font-medium">{track.original_title}</span> 
               <span className="text-gray-500">&bull;</span> {track.original_artist}
             </p>
          </div>
          <button 
             onClick={onClose} 
             className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Area */}
        <div className="p-5 border-b border-white/[0.05] bg-gray-950/50">
          <div className="flex gap-3 relative">
            <div className="relative flex-1">
               <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
               </div>
               <input
                 value={query}
                 onChange={(e) => setQuery(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
                 className="w-full bg-black/50 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-inner placeholder-gray-600"
                 placeholder="Search by track name, artist, or album..."
                 autoFocus
               />
            </div>
            <button
              onClick={() => doSearch(query)}
              className="bg-white text-gray-950 hover:bg-gray-200 px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-sm whitespace-nowrap"
            >
              Search
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-950/20">
          {loading && (
             <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                <p className="text-sm font-medium">Searching Spotify...</p>
             </div>
          )}
          
          {error && (
             <div className="mx-4 my-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
             </div>
          )}
          
          {!loading && results.length === 0 && !error && (
             <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Music className="w-10 h-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">No results found for your search.</p>
                <p className="text-xs mt-1">Try adjusting the query terms above.</p>
             </div>
          )}
          
          {results.map((result) => (
            <div
              key={result.spotify_id}
              className="flex items-center gap-4 p-3 hover:bg-white/[0.04] rounded-xl transition-colors group border border-transparent hover:border-white/[0.05]"
            >
              {result.image_url ? (
                <img
                  src={result.image_url}
                  alt={result.title}
                  className="w-12 h-12 rounded-md object-cover shadow-md flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Music className="w-5 h-5 text-gray-500" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate group-hover:text-green-400 transition-colors">{result.title}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5 font-medium">
                  {result.artist} <span className="text-gray-600 mx-1">&bull;</span> {result.album}
                </p>
              </div>
              
              <div className="flex items-center gap-4 pl-2">
                 <span className="text-xs font-mono text-gray-500 hidden sm:block">{formatDuration(result.duration_ms)}</span>
                 <button
                   onClick={() => handleAdd(result.spotify_id)}
                   disabled={adding === result.spotify_id}
                   className="bg-transparent border border-gray-600 hover:border-green-500 hover:text-green-400 text-gray-300 disabled:opacity-50 disabled:hover:border-gray-600 disabled:hover:text-gray-300 px-4 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 w-24 flex justify-center uppercase tracking-wider"
                 >
                   {adding === result.spotify_id ? 'Adding...' : 'Add'}
                 </button>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </div>
  )
}
