import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import ruby from 'vite-plugin-ruby'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [ruby(), react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./app/frontend/src', import.meta.url)) } },
  server: { allowedHosts: ['vite'], watch: { usePolling: true, interval: 250 } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
