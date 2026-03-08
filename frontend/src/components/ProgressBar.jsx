export default function ProgressBar({ label, percentage, status, customColor = 'bg-green-500' }) {
  let colorClass = customColor
  let borderClass = 'border-transparent'
  let labelColor = 'text-gray-300'
  
  if (status === 'error') {
    colorClass = 'bg-red-500'
    borderClass = 'border-red-500/20'
    labelColor = 'text-red-400'
  } else if (status === 'success') {
    colorClass = 'bg-green-400'
    labelColor = 'text-green-400'
  } else if (status === 'skipped') {
    colorClass = 'bg-gray-500'
    borderClass = 'border-gray-500/20'
    labelColor = 'text-gray-400'
  }

  // Cap percentage visually so the bar doesn't break out
  const displayPct = Math.min(Math.max(percentage, 0), 100)

  return (
    <div className="w-full mb-5 last:mb-0 space-y-2">
      <div className="flex justify-between items-end mb-1">
        <span className={`text-sm font-semibold tracking-wide ${labelColor}`}>{label}</span>
        <span className="text-sm font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded-md border border-gray-800 shadow-inner">
          {displayPct.toFixed(1)}%
        </span>
      </div>
      <div className={`w-full h-3 bg-gray-900 rounded-full overflow-hidden border ${borderClass} shadow-inner`}>
        <div
          className={`h-full ${colorClass} transition-all duration-500 ease-out relative`}
          style={{ width: `${displayPct}%` }}
        >
          {status === 'active' && displayPct < 100 && (
            <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
          )}
        </div>
      </div>
    </div>
  )
}
