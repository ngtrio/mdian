import {useEffect, useRef} from 'react'
import {Link, useLocation, useParams} from '@tanstack/react-router'

import {
  getDemoWikiPageBySlug
} from './demo-content.js'
import {DemoMarkdown} from './demo-markdown.js'

export function WikiPage() {
  const params = useParams({strict: false})
  const locationHash = useLocation({select: (location) => location.hash})
  const articleRef = useRef<HTMLDivElement>(null)
  const pageSlug = decodeDemoRoutePath(typeof params._splat === 'string' ? params._splat : '')
  const page = getDemoWikiPageBySlug(pageSlug)
  const activeTargetHash = decodeDemoLocationHash(locationHash).trim()

  useEffect(() => {
    const root = articleRef.current

    if (!root) {
      return
    }

    if (!locationHash) {
      window.scrollTo({top: 0, behavior: 'auto'})
      return
    }

    let timeoutId = 0
    const frameId = window.requestAnimationFrame(() => {
      const target = activeTargetHash
        ? root.ownerDocument.getElementById(activeTargetHash)
        : null

      if (!target || !root.contains(target)) {
        return
      }

      target.classList.add('is-targeted')
      timeoutId = window.setTimeout(() => target.classList.remove('is-targeted'), 1800)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      root.querySelectorAll('.is-targeted').forEach((element) => element.classList.remove('is-targeted'))
    }
  }, [activeTargetHash, locationHash, pageSlug])

  return (
    <div className="demo-shell demo-shell--showcase wiki-shell">
      <p className="back-link">
        <Link to="/">Back to showcase</Link>
      </p>

      <header className="demo-hero-header wiki-hero-header">
        <div>
          <h1>{page?.title ?? 'Missing note'}</h1>
          <p>
            {page?.summary ?? `No demo note matches "${pageSlug || 'this route'}".`}
          </p>
        </div>
        <div className="wiki-target" aria-label="Current wiki target">
          <span>Path: /{pageSlug || 'missing-page'}</span>
          {activeTargetHash ? <span>Target: #{activeTargetHash}</span> : null}
        </div>
      </header>

      {page ? (
        <section className="hero-stage hero-stage--wiki panel">
          <div ref={articleRef}>
            <DemoMarkdown
              className="preview preview--hero markdown-body wiki-markdown"
              markdown={page.markdown}
            />
          </div>
        </section>
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Page not found</h2>
              <p>The requested demo note does not exist.</p>
            </div>
          </div>
          <p className="empty-state">
            The route <code>{pageSlug || '/wiki'}</code> does not exist in the demo note set.
          </p>
        </section>
      )}
    </div>
  )
}

function decodeDemoLocationHash(value: string): string {
  const fragment = value.startsWith('#') ? value.slice(1) : value

  try {
    return decodeURIComponent(fragment)
  } catch {
    return fragment
  }
}

function decodeDemoRoutePath(value: string): string {
  const trimmed = value.trim()

  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}
