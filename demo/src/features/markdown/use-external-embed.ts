import {useEffect, type RefObject} from 'react'

const twitterScriptId = 'demo-twitter-widgets'
const twitterScriptSrc = 'https://platform.twitter.com/widgets.js'

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load?: (element?: HTMLElement) => void
      }
    }
  }
}

export function useDemoExternalEmbeds(
  containerRef: RefObject<HTMLElement | null>,
  contentKey: string
) {
  useEffect(() => {
    const root = containerRef.current

    if (!root || !root.querySelector('blockquote.twitter-tweet')) {
      return
    }

    let disposed = false
    const loadWidgets = () => {
      if (disposed) {
        return
      }

      window.twttr?.widgets?.load?.(root)
    }

    if (window.twttr?.widgets?.load) {
      loadWidgets()
      return
    }

    const existingScript = document.getElementById(twitterScriptId)

    if (existingScript instanceof HTMLScriptElement) {
      existingScript.addEventListener('load', loadWidgets)

      return () => {
        disposed = true
        existingScript.removeEventListener('load', loadWidgets)
      }
    }

    const script = document.createElement('script')
    script.id = twitterScriptId
    script.src = twitterScriptSrc
    script.async = true
    script.charset = 'utf-8'
    script.addEventListener('load', loadWidgets)
    document.body.append(script)

    return () => {
      disposed = true
      script.removeEventListener('load', loadWidgets)
    }
  }, [containerRef, contentKey])
}
