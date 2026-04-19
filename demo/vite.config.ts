import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {fileURLToPath} from 'node:url'

const base = resolvePagesBase()

export default defineConfig({
  base,
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
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        notFound: fileURLToPath(new URL('./404.html', import.meta.url))
      }
    }
  },
  preview: {
    port: 4173
  }
})

function resolvePagesBase(): string {
  const explicitBase = process.env.PAGES_BASE_PATH

  if (explicitBase) {
    return normalizeBasePath(explicitBase)
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    const repository = process.env.GITHUB_REPOSITORY
    const repositoryName = repository?.split('/')[1]

    if (repositoryName) {
      return `/${repositoryName}/`
    }
  }

  return '/'
}

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim()

  if (!trimmedBasePath || trimmedBasePath === '/') {
    return '/'
  }

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, '')}/`
}
