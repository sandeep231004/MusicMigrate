import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LogOut, ArrowRight, Library as LibraryIcon, CheckSquare, Square } from 'lucide-react'
import { getPlaylists, getAlbums, logout } from '../api.js'
import PlaylistCard from '../components/PlaylistCard.jsx'
import AlbumCard from '../components/AlbumCard.jsx'

const TRANSFER_ITEMS_STORAGE_KEY = 'mm_transfer_items'

export default function Library() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('playlists')
  const [selectedPlaylists, setSelectedPlaylists] = useState(new Set())
  const [selectedAlbums, setSelectedAlbums] = useState(new Set())

  const { data: playlists = [], isLoading: playlistsLoading, error: playlistsError } = useQuery({
    queryKey: ['playlists'],
    queryFn: getPlaylists,
    retry: false,
  })

  const { data: albums = [], isLoading: albumsLoading, error: albumsError } = useQuery({
    queryKey: ['albums'],
    queryFn: getAlbums,
    retry: false,
  })

  const togglePlaylist = (id) =>
    setSelectedPlaylists((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAlbum = (id) =>
    setSelectedAlbums((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleStartTransfer = () => {
    const items = [
      ...Array.from(selectedPlaylists).map((id) => {
        const p = playlists.find((pl) => pl.id === id)
        return { type: 'playlist', id, name: p.name }
      }),
      ...Array.from(selectedAlbums).map((id) => {
        const a = albums.find((al) => al.id === id)
        return { type: 'album', id, name: a.name, artist: a.artist }
      }),
    ]
    sessionStorage.setItem(TRANSFER_ITEMS_STORAGE_KEY, JSON.stringify(items))
    navigate('/transfer', { state: { items } })
  }

  const totalSelected = selectedPlaylists.size + selectedAlbums.size
  const isLoading = playlistsLoading || albumsLoading

  return (
    <div className="flex flex-col min-h-full">
      {/* Sticky Header Actions */}
      <div className="sticky top-16 z-30 bg-gray-950/90 backdrop-blur-md border-b border-gray-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <LibraryIcon className="w-8 h-8 text-green-500" />
              Your Library
            </h1>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-sm text-gray-400">Select the items you want to migrate.</p>
              <span className="text-gray-700">&bull;</span>
              <button
                onClick={async () => { await logout(); navigate('/') }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect Account
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 sm:justify-end">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-200">
                {totalSelected} selected
              </p>
              <p className="text-xs text-gray-400">
                {selectedPlaylists.size} playlists, {selectedAlbums.size} albums
              </p>
            </div>
            <button
              onClick={handleStartTransfer}
              disabled={totalSelected === 0}
              className="group bg-green-500 text-gray-950 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-full font-bold transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-900"
            >
              Start Transfer
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {(playlistsError || albumsError) && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-sm">
          <span className="shrink-0 text-red-500">⚠️</span>
          <div>
            <p className="font-semibold text-red-400 mb-1">Failed to load library</p>
            <p className="font-mono text-xs text-red-300 break-all">
              {(playlistsError || albumsError)?.response?.data?.detail
                || (playlistsError || albumsError)?.message
                || 'Unknown error - check the backend terminal for details.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 bg-gray-900/50 rounded-xl mb-8 w-fit border border-gray-800">
        {['playlists', 'albums'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
              activeTab === tab
                ? 'bg-gray-800 text-white shadow-sm ring-1 ring-white/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {tab} <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${activeTab === tab ? 'bg-gray-700 text-gray-300' : 'bg-gray-800 text-gray-500'}`}>
              {tab === 'playlists' ? playlists.length : albums.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-green-500 rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-400 animate-pulse">Loading from YouTube Music...</p>
        </div>
      ) : (
        <div className="animate-fade-in pb-12">
          {activeTab === 'playlists' && (
            <>
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setSelectedPlaylists(new Set(playlists.map((p) => p.id)))}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 transition-colors bg-green-400/10 hover:bg-green-400/20 px-3 py-1.5 rounded-lg"
                >
                  <CheckSquare className="w-4 h-4" /> Select All
                </button>
                <button
                  onClick={() => setSelectedPlaylists(new Set())}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-lg"
                >
                  <Square className="w-4 h-4" /> Deselect All
                </button>
              </div>
              
              {playlists.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800/50 border-dashed mt-4">
                  <LibraryIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No playlists found in your library.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
                  {playlists.map((p) => (
                    <PlaylistCard
                      key={p.id}
                      playlist={p}
                      selected={selectedPlaylists.has(p.id)}
                      onToggle={() => togglePlaylist(p.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'albums' && (
            <>
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setSelectedAlbums(new Set(albums.map((a) => a.id)))}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 transition-colors bg-green-400/10 hover:bg-green-400/20 px-3 py-1.5 rounded-lg"
                >
                  <CheckSquare className="w-4 h-4" /> Select All
                </button>
                <button
                  onClick={() => setSelectedAlbums(new Set())}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors bg-gray-800/50 hover:bg-gray-700/50 px-3 py-1.5 rounded-lg"
                >
                  <Square className="w-4 h-4" /> Deselect All
                </button>
              </div>
              
              {albums.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/30 rounded-2xl border border-gray-800/50 border-dashed mt-4">
                  <LibraryIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No saved albums found in your library.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 lg:gap-x-6 lg:gap-y-10">
                  {albums.map((a) => (
                    <AlbumCard
                      key={a.id}
                      album={a}
                      selected={selectedAlbums.has(a.id)}
                      onToggle={() => toggleAlbum(a.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
