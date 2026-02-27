import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBase = env.VITE_API_BASE || env.VITE_API_URL || ''

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_BASE': JSON.stringify(apiBase),
    },
  }
})
