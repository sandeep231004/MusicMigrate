import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // SSE endpoint — must be listed first (most specific match wins).
      // Disable compression so the stream is not buffered by the proxy.
      '/spotify/transfer': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        headers: { 'Accept-Encoding': 'identity' },
      },
      '/auth': 'http://127.0.0.1:8000',
      '/youtube': 'http://127.0.0.1:8000',
      '/spotify': 'http://127.0.0.1:8000',
    },
  },
})
