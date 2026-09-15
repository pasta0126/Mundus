import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Mirrors mundus-web's nginx /api/ -> mundus-api proxy in production,
    // so the frontend can always call same-origin /api/... in dev too.
    proxy: {
      '/api': 'http://localhost:5253',
    },
  },
})
