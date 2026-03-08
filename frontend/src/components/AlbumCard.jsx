import { Check } from 'lucide-react'

export default function AlbumCard({ album, selected, onToggle }) {
  return (
    <div
      className={`group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl ${
        selected ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-gray-950 bg-gray-800' : 'bg-gray-900 border border-gray-800 hover:border-gray-700'
      }`}
      onClick={onToggle}
    >
      <div className="aspect-square bg-gray-900 relative">
        {album.thumbnail_url ? (
          <img
            src={album.thumbnail_url}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-800">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
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
        <p className="font-semibold text-sm text-gray-100 truncate mb-0.5" title={album.name}>{album.name}</p>
        <p className="text-xs text-gray-400 font-medium truncate" title={album.artist}>{album.artist}</p>
        {album.year && <p className="text-xs text-gray-500 mt-1">{album.year}</p>}
      </div>
    </div>
  )
}
