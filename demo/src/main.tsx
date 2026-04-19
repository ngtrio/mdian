import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import 'katex/dist/katex.min.css'
import 'mdian/styles.css'
import './styles.css'
import { router } from './app/router.js'

const container = document.getElementById('app')

if (!container) {
  throw new Error('Missing #app root element')
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
