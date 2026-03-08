import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, SearchX, ChevronLeft } from 'lucide-react'
import { getUnmatched } from '../api.js'
import TrackRow from '../components/TrackRow.jsx'
import SearchModal from '../components/SearchModal.jsx'

function readSessionUnmatched() {
  try {
    const raw = sessionStorage.getItem('mm_unmatched_tracks')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function Results() {
  const navigate = useNavigate()
  const [matched, setMatched] = useState(new Set())
  const [modalTrack, setModalTrack] = useState(null)

  const { data: unmatched = [], isLoading } = useQuery({
    queryKey: ['unmatched'],
    queryFn: getUnmatched,
  })

  // Also read from session storage in case we just finished a transfer and the backend state isn't perfectly synced yet
  const sessionUnmatched = readSessionUnmatched()
  
  // Use whichever has more tracks, prioritizing backend if available
  const displayTracks = unmatched.length > sessionUnmatched.length ? unmatched : sessionUnmatched

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16">
           <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  if (displayTracks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] animate-fade-in">
        <div className="glass-panel p-10 md:p-14 rounded-3xl text-center max-w-lg mx-auto flex flex-col items-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white tracking-tight">Perfect Transfer!</h2>
          <p className="text-gray-400 mb-8 text-lg leading-relaxed">
            Every single track from your selected library was successfully matched and added to Spotify.
          </p>
          <button
            onClick={() => navigate('/library')}
            className="w-full bg-white text-gray-950 hover:bg-gray-100 px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:ring-4 focus:ring-white/20"
          >
            Back to Library
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <button 
            onClick={() => navigate('/library')}
            className="text-gray-400 hover:text-white flex items-center gap-1.5 text-sm font-medium transition-colors mb-4 group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Library
          </button>
          
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3 mb-2">
            <SearchX className="w-8 h-8 text-red-400" />
            Unmatched Tracks
          </h1>
          <p className="text-gray-400 text-lg">
            We couldn&apos;t automatically find these <span className="text-white font-semibold">{displayTracks.length}</span> tracks on Spotify.
          </p>
        </div>
        
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-4 flex items-center gap-4 px-6">
           <div className="flex flex-col">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Resolved</span>
              <span className="text-2xl font-bold text-green-400">{matched.size} <span className="text-gray-600 text-lg">/ {displayTracks.length}</span></span>
           </div>
           
           {matched.size === displayTracks.length && (
              <div className="ml-4 py-1 px-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <CheckCircle2 className="w-3.5 h-3.5" /> All Done
              </div>
           )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel rounded-2xl overflow-hidden bg-gray-900/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05] bg-black/20 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-4 px-6 w-1/2">Track Details</th>
                <th className="py-4 px-6 hidden sm:table-cell">Artist</th>
                <th className="py-4 px-6 hidden md:table-cell">Source Playlist</th>
                <th className="py-4 px-6 text-right sm:text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {displayTracks.map((track, i) => (
                <TrackRow
                  key={i}
                  track={track}
                  matched={matched.has(i)}
                  onFindOnSpotify={() => setModalTrack({ ...track, index: i })}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalTrack && (
        <SearchModal
          track={modalTrack}
          playlistId={modalTrack.playlist_id}
          onMatch={() =>
            setMatched((prev) => new Set([...prev, modalTrack.index]))
          }
          onClose={() => setModalTrack(null)}
        />
      )}
    </div>
  )
}
