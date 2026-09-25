import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isVisify = env.VITE_APP_TARGET === 'visify'
  const base = env.VITE_BASE_PATH || '/'

  return {
    plugins: [react()],
    base,
    build: {
      outDir: isVisify ? 'dist-visify' : 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: isVisify
          ? resolve(rootDir, 'visify/index.html')
          : resolve(rootDir, 'index.html'),
      },
    },
    server: {
      allowedHosts: true,
    },
  }
})
