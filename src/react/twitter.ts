import type {TwitterWidgetsApi} from './types.js'

export interface LoadTwitterWidgetsInput {
  loadScript?: () => Promise<TwitterWidgetsApi>
}

declare global {
  interface Window {
    twttr?: {
      widgets?: TwitterWidgetsApi
    }
  }
}

let twitterWidgetsPromise: Promise<TwitterWidgetsApi> | undefined

export function loadTwitterWidgets(input: LoadTwitterWidgetsInput = {}): Promise<TwitterWidgetsApi> {
  if (input.loadScript) {
    return input.loadScript()
  }

  if (twitterWidgetsPromise) {
    return twitterWidgetsPromise
  }

  twitterWidgetsPromise = new Promise<TwitterWidgetsApi>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Twitter widgets require a browser environment.'))
      return
    }

    const existing = window.twttr?.widgets
    if (existing) {
      resolve(existing)
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://platform.twitter.com/widgets.js'
    script.onload = () => {
      const widgets = window.twttr?.widgets
      if (widgets) {
        resolve(widgets)
      } else {
        reject(new Error('Twitter widgets loaded without exposing window.twttr.widgets.'))
      }
    }
    script.onerror = () => reject(new Error('Twitter widgets failed to load.'))
    document.head.appendChild(script)
  }).catch((error) => {
    twitterWidgetsPromise = undefined
    throw error
  })

  return twitterWidgetsPromise
}
