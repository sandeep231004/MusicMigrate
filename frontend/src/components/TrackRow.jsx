import { CheckCircle2, Search } from 'lucide-react'

export default function TrackRow({ track, onFindOnSpotify, matched }) {
  return (
    <tr className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors group">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
            <span className="text-gray-500 font-medium text-xs">🎵</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors line-clamp-1">{track.original_title}</span>
            <span className="text-xs text-gray-500 mt-0.5 sm:hidden">{track.original_artist}</span>
          </div>
        </div>
      </td>
      <td className="py-4 px-6 text-sm text-gray-400 hidden sm:table-cell">{track.original_artist}</td>
      <td className="py-4 px-6 text-sm text-gray-500 hidden md:table-cell">
        <span className="bg-gray-800/50 px-2.5 py-1 rounded-md text-xs border border-gray-700/50">
          {track.playlist_name}
        </span>
      </td>
      <td className="py-4 px-6 text-right sm:text-left text-sm whitespace-nowrap">
        {matched ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 font-medium text-xs border border-green-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Matched
          </span>
        ) : (
          <button
            onClick={onFindOnSpotify}
            className="inline-flex items-center gap-1.5 bg-white text-gray-950 hover:bg-gray-200 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        )}
      </td>
    </tr>
  )
}
