import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'mdian/react-markdown': fileURLToPath(new URL('../src/react-markdown/index.ts', import.meta.url)),
      'mdian/styles.css': fileURLToPath(new URL('../src/styles.css', import.meta.url)),
      'mdian': fileURLToPath(new URL('../src/index.ts', import.meta.url))
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
