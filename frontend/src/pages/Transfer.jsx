import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Activity, XCircle, SkipForward } from 'lucide-react'
import { createTransferEventSource } from '../api.js'
import ProgressBar from '../components/ProgressBar.jsx'

const TRANSFER_ITEMS_STORAGE_KEY = 'mm_transfer_items'

function parsePlaylistSummary(message) {
  const match = /(\d+)\s+added,\s+(\d+)\s+unmatched/i.exec(message || '')
  if (!match) return { added: 0, unmatched: 0 }
  return { added: Number(match[1]), unmatched: Number(match[2]) }
}

export default function Transfer() {
  const location = useLocation()
  const navigate = useNavigate()
  const items =
    location.state?.items || JSON.parse(sessionStorage.getItem(TRANSFER_ITEMS_STORAGE_KEY) || '[]')

  const [progress, setProgress] = useState({
    status: 'idle',
    overall_progress: 0,
    current_item: null,
    item_progress: 0,
    total_tracks_processed: 0,
    total_tracks_matched: 0,
    total_tracks_unmatched: 0,
    logs: [],
  })

  const logsEndRef = useRef(null)
  const startedRef = useRef(false)
  const completedItemsRef = useRef(0)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [progress.logs])

  useEffect(() => {
    if (!items || items.length === 0) {
      navigate('/library')
      return
    }
    if (startedRef.current) return
    startedRef.current = true

    sessionStorage.setItem(TRANSFER_ITEMS_STORAGE_KEY, JSON.stringify(items))
    setProgress((p) => ({
      ...p,
      status: 'active',
      logs: [{ type: 'info', msg: 'Starting transfer process...' }],
    }))

    const eventSource = createTransferEventSource(items)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      setProgress((prev) => {
        const next = { ...prev }

        switch (data.event) {
          case 'playlist_start':
            next.current_item = { name: data.item_name, type: 'playlist', total: data.total || 0 }
            next.item_progress = 0
            next.logs = [
              ...prev.logs,
              { type: 'info', msg: `Processing playlist: ${data.item_name}` },
            ]
            break

          case 'track_done': {
            const total = data.total || 0
            const current = data.current || 0
            const itemPct = total > 0 ? (current / total) * 100 : 0
            const overallPct =
              ((completedItemsRef.current + (total > 0 ? current / total : 0)) /
                Math.max(items.length, 1)) *
              100

            next.item_progress = itemPct
            next.overall_progress = overallPct
            next.total_tracks_processed = prev.total_tracks_processed + 1
            break
          }

          case 'playlist_done': {
            const { added, unmatched } = parsePlaylistSummary(data.message)
            completedItemsRef.current += 1
            next.item_progress = 100
            next.overall_progress = (completedItemsRef.current / Math.max(items.length, 1)) * 100
            next.total_tracks_matched = prev.total_tracks_matched + added
            next.total_tracks_unmatched = prev.total_tracks_unmatched + unmatched
            next.logs = [
              ...prev.logs,
              { type: 'info', msg: `Completed playlist: ${data.item_name} (${data.message})` },
            ]
            break
          }

          case 'album_start':
            next.current_item = { name: data.item_name, type: 'album', total: 1 }
            next.item_progress = 0
            next.logs = [
              ...prev.logs,
              { type: 'info', msg: `Processing album: ${data.item_name}` },
            ]
            break

          case 'album_done':
            completedItemsRef.current += 1
            next.item_progress = 100
            next.overall_progress = (completedItemsRef.current / Math.max(items.length, 1)) * 100
            next.logs = [
              ...prev.logs,
              { type: 'info', msg: `Completed album: ${data.item_name} (${data.message})` },
            ]
            break

          case 'complete':
            next.status = 'completed'
            next.overall_progress = 100
            next.item_progress = 100
            next.logs = [...prev.logs, { type: 'success', msg: data.message || 'Transfer complete.' }]
            sessionStorage.removeItem(TRANSFER_ITEMS_STORAGE_KEY)
            eventSource.close()
            break

          case 'error':
            next.status = 'error'
            next.logs = [...prev.logs, { type: 'error', msg: `Error: ${data.message}` }]
            eventSource.close()
            break

          default:
            break
        }

        return next
      })
    }

    eventSource.onerror = () => {
      eventSource.close()
      setProgress((prev) => ({
        ...prev,
        status: 'error',
        logs: [...prev.logs, { type: 'error', msg: 'Connection to server lost.' }],
      }))
    }

    return () => {
      eventSource.close()
    }
  }, [items, navigate])

  const getLogStyle = (type) => {
    switch (type) {
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'warning': return 'text-gray-400'
      default: return 'text-gray-300'
    }
  }

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      case 'error': return <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      case 'warning': return <SkipForward className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      default: return <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-500" />
    }
  }

  if (!items || items.length === 0) return null

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2 mb-2">
            <Activity className={`w-8 h-8 ${progress.status === 'active' ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
            Transfer Progress
          </h1>
          <p className="text-gray-400">Migrating {items.length} items to Spotify</p>
        </div>

        {progress.status === 'completed' && (
          <button
            onClick={() => navigate('/results')}
            className="w-full md:w-auto bg-white text-gray-950 hover:bg-gray-100 px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Review Unmatched Tracks
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col justify-between h-full bg-gray-900/50">
          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-bold text-white">Overall Progress</h3>
                <span className={`text-sm font-semibold uppercase tracking-wider ${
                  progress.status === 'active' ? 'text-green-400' :
                  progress.status === 'completed' ? 'text-blue-400' :
                  progress.status === 'error' ? 'text-red-400' : 'text-gray-500'
                }`}>
                  {progress.status}
                </span>
              </div>
              <ProgressBar
                label=""
                percentage={progress.overall_progress}
                status={progress.status}
              />
            </div>

            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Current Activity</h3>
              <ProgressBar
                label={progress.current_item ? `Processing: ${progress.current_item.name}` : 'Preparing...'}
                percentage={progress.item_progress}
                status={progress.status === 'error' ? 'error' : 'active'}
                customColor="bg-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-10 pt-6 border-t border-gray-800">
            <div className="text-center p-3 bg-gray-950/50 rounded-xl border border-gray-800/50 box-shadow-sm">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Processed</p>
              <p className="text-2xl font-mono text-white">{progress.total_tracks_processed}</p>
            </div>
            <div className="text-center p-3 bg-green-500/5 rounded-xl border border-green-500/10 box-shadow-sm">
              <p className="text-xs text-green-500 font-semibold uppercase tracking-wider mb-1">Matched</p>
              <p className="text-2xl font-mono text-green-400">{progress.total_tracks_matched}</p>
            </div>
            <div className="text-center p-3 bg-red-500/5 rounded-xl border border-red-500/10 box-shadow-sm">
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wider mb-1">Unmatched</p>
              <p className="text-2xl font-mono text-red-400">{progress.total_tracks_unmatched}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col h-full bg-gray-950/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Activity Log
            </h3>
          </div>
          <div className="flex-1 bg-black/60 rounded-xl p-4 font-mono text-sm overflow-hidden border border-gray-800/80 relative -mx-2 sm:mx-0 shadow-inner min-h-[300px] lg:min-h-0">
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none"></div>
            <div className="h-full overflow-y-auto pr-2 space-y-2 relative pb-4">
              {progress.logs.map((log, i) => (
                <div key={i} className={`flex items-start gap-2 break-words ${getLogStyle(log.type)}`}>
                  {getLogIcon(log.type)}
                  <span className="leading-snug">{log.msg}</span>
                </div>
              ))}
              <div ref={logsEndRef} className="h-2" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
