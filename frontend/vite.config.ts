import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Auth API routes — must come BEFORE the general /api rule (first match wins)
      '/api/v1/auth': {
        target: 'http://localhost:5086',
        changeOrigin: true,
      },
      '/api/v1/tenants': {
        target: 'http://localhost:5086',
        changeOrigin: true,
      },
      '/api/v1/users': {
        target: 'http://localhost:5086',
        changeOrigin: true,
      },
      '/api/v1/login-events': {
        target: 'http://localhost:5086',
        changeOrigin: true,
      },
      // Engine API (evaluations, triggers, engine info, admin)
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
})
