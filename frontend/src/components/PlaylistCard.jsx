import { Check } from 'lucide-react'

export default function PlaylistCard({ playlist, selected, onToggle }) {
  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl ${
        selected ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-950 bg-gray-800' : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
      }`}
      onClick={onToggle}
    >
      <div className="aspect-square bg-gray-900 relative">
        {playlist.thumbnail_url ? (
          <img
            src={playlist.thumbnail_url}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-800">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
        
        {/* Selection Overlay Darkening */}
        <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-20'}`}></div>
        
        {/* Selection Checkmark */}
        <div className={`absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 transform ${
          selected ? 'scale-100 bg-green-500 text-gray-950' : 'scale-0 bg-transparent'
        }`}>
          <Check className="w-4 h-4 font-bold" strokeWidth={3} />
        </div>
      </div>
      
      <div className="p-4">
        <p className="font-semibold text-sm text-gray-100 truncate mb-0.5" title={playlist.name}>{playlist.name}</p>
        <p className="text-xs text-gray-400 font-medium">{playlist.track_count} tracks</p>
      </div>
    </div>
  )
}
