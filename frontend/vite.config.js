import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:8000',
      '/youtube': 'http://localhost:8000',
      '/spotify': 'http://localhost:8000',
    },
  },
})
