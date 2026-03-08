import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAuthStatus } from './api.js'
import Setup from './pages/Setup.jsx'
import Library from './pages/Library.jsx'
import Transfer from './pages/Transfer.jsx'
import Results from './pages/Results.jsx'

function AppRoutes() {
  const { data: authStatus } = useQuery({
    queryKey: ['authStatus'],
    queryFn: getAuthStatus,
    refetchInterval: 2000,
  })

  return (
    <Routes>
      <Route
        path="/"
        element={
          authStatus?.spotify && authStatus?.ytmusic ? (
            <Navigate to="/library" replace />
          ) : (
            <Setup authStatus={authStatus} />
          )
        }
      />
      <Route path="/library" element={<Library />} />
      <Route path="/transfer" element={<Transfer />} />
      <Route path="/results" element={<Results />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      {/* Background with a subtle gradient matching the Spotify native vibe */}
      <div className="min-h-screen bg-gray-950 font-sans text-gray-100 selection:bg-green-500/30">
        
        {/* Simple Global Header */}
        <header className="glass-header h-16 flex items-center px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-950 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">MusicMigrate</span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="pb-12 pt-8 animate-fade-in relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AppRoutes />
        </main>
        
      </div>
    </BrowserRouter>
  )
}
