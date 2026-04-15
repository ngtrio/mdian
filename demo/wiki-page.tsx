import {useEffect, useMemo, useRef} from 'react'
import {useLocation, useParams} from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'

import {
  decodeOfmFragment,
  findOfmAnchorTarget,
  getOfmAnchorKeyFromHash,
  remarkOfm,
  rehypeOfm
} from 'remark-ofm'
import {createMarkdownComponents} from './lib/markdown-components.js'
import {buildWikiHref, demoWikiPages, getDemoWikiPage, normalizeWikiPath} from './lib/wiki.js'

export function WikiPage() {
  const params = useParams({strict: false})
  const locationHash = useLocation({select: (location) => location.hash})
  const articleRef = useRef<HTMLElement>(null)
  const pagePath = normalizeWikiPath(typeof params._splat === 'string' ? params._splat : '')
  const page = getDemoWikiPage(pagePath)
  const activeFragment = decodeOfmFragment(locationHash)
  const markdownComponents = useMemo(() => createMarkdownComponents(), [])

  useEffect(() => {
    const root = articleRef.current
    const targetKey = getOfmAnchorKeyFromHash(locationHash)

    if (!root) {
      return
    }

    if (!targetKey) {
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
    <div className="demo-shell wiki-shell">
      <p className="back-link">
        <a href="/">Back to playground</a>
      </p>

      <header className="page-header">
        <h1>{page?.title ?? 'Missing note'}</h1>
        <p>
          {page?.summary ?? `No demo note matches "${pagePath || 'this route'}". Choose one of the built-in pages below.`}
        </p>
      </header>

      <div className="wiki-target" aria-label="Current wiki target">
        <span>Path: /{pagePath || 'missing-page'}</span>
        {activeFragment ? <span>Target: #{activeFragment}</span> : null}
      </div>

      {page ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{page.path}</h2>
              <p>Rendered wiki target.</p>
            </div>
          </div>
          <article className="preview markdown-body wiki-markdown" ref={articleRef}>
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[[rehypeOfm, {hrefPrefix: 'wiki'}]]}
              remarkPlugins={[[remarkOfm]]}
            >
              {page.markdown}
            </ReactMarkdown>
          </article>
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

      <section className="panel page-list-panel">
        <div className="panel-header">
          <div>
            <h2>Demo notes</h2>
            <p>Open one to test wiki navigation.</p>
          </div>
        </div>
        <div className="wiki-page-list" aria-label="Available demo notes">
          {demoWikiPages.map((wikiPage) => (
            <a className="wiki-page-link" href={buildWikiHref(wikiPage.path)} key={wikiPage.path}>
              <strong>{wikiPage.path}</strong>
              <span>{wikiPage.summary}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
