import {useEffect, useRef} from 'react'
import {Link, useLocation, useParams} from '@tanstack/react-router'

import {
  decodeOfmFragment,
  findOfmAnchorTarget,
} from 'mdian'
import {getDemoWikiPage, normalizeDemoWikiPath} from '../content/demo-content.js'
import {DemoMarkdown} from '../features/markdown/demo-markdown.js'

export function WikiPage() {
  const params = useParams({strict: false})
  const locationHash = useLocation({select: (location) => location.hash})
  const articleRef = useRef<HTMLDivElement>(null)
  const pagePath = normalizeDemoWikiPath(typeof params._splat === 'string' ? params._splat : '')
  const page = getDemoWikiPage(pagePath)
  const activeFragment = decodeOfmFragment(locationHash)
  const contentKey = `${pagePath}:${page?.markdown ?? ''}`

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
      const target = findOfmAnchorTarget(root, locationHash) as HTMLElement | undefined

      if (!target) {
        return
      }

      target.classList.add('is-targeted')
      target.scrollIntoView({block: 'start', behavior: 'smooth'})
      timeoutId = window.setTimeout(() => target.classList.remove('is-targeted'), 1800)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      root.querySelectorAll('.is-targeted').forEach((element) => element.classList.remove('is-targeted'))
    }
  }, [locationHash, pagePath])

  return (
    <div className="demo-shell demo-shell--showcase wiki-shell">
      <p className="back-link">
        <Link to="/">Back to showcase</Link>
      </p>

      <header className="demo-hero-header wiki-hero-header">
        <div>
          <h1>{page?.title ?? 'Missing note'}</h1>
          <p>
            {page?.summary ?? `No demo note matches "${pagePath || 'this route'}".`}
          </p>
        </div>
        <div className="wiki-target" aria-label="Current wiki target">
          <span>Path: /{pagePath || 'missing-page'}</span>
          {activeFragment ? <span>Target: #{activeFragment}</span> : null}
        </div>
      </header>

      {page ? (
        <section className="hero-stage hero-stage--wiki panel">
          <div ref={articleRef}>
            <DemoMarkdown
              className="preview preview--hero markdown-body wiki-markdown"
              contentKey={contentKey}
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
            The route <code>{pagePath || '/wiki'}</code> does not exist in the demo note set.
          </p>
        </section>
      )}
    </div>
  )
}
