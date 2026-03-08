import { CheckCircle2, XCircle } from 'lucide-react'

export default function StatusBadge({ connected, label }) {
  if (connected) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-medium">
        <CheckCircle2 className="w-4 h-4" />
        {label}
      </div>
    )
  }
  
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 text-gray-400 border border-gray-700 text-xs font-medium">
      <XCircle className="w-4 h-4" />
      {label}
    </div>
  )
}
