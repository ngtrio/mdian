import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'remark-ofm': fileURLToPath(new URL('../src/index.ts', import.meta.url))
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  preview: {
    port: 4173
  }
})
