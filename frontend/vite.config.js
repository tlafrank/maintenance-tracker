import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function parseAllowedHosts(rawHosts) {
  if (!rawHosts) return []
  return rawHosts
    .split(',')
    .map(host => host.trim())
    .filter(Boolean)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawAllowedHosts = env.VITE_ALLOWED_HOSTS || process.env.VITE_ALLOWED_HOSTS || ''
  const allowedHosts = parseAllowedHosts(rawAllowedHosts)

  return {
    plugins: [react()],
    base: env.VITE_APP_BASE_PATH || '/',
    server: {
      allowedHosts,
    },
    preview: {
      allowedHosts,
    },
  }
})
