import {render} from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import {describe, expect, test, vi} from 'vitest'

import {createOfmComponents, createOfmReactMarkdown} from '../src/react-markdown/index.js'

describe('mdian React adapter', () => {
  test('passes wikilink metadata to a custom renderer', () => {
    const renderWikiLink = vi.fn(({children, href, path, permalink, alias}) => (
      <span data-alias={alias} data-href={href} data-path={path} data-permalink={permalink}>
        {children}
      </span>
    ))
    const ofm = createOfmReactMarkdown({
      components: {renderWikiLink},
      ofm: {wikilinks: true}
    })

    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'[[Page|Alias]]'}
      </ReactMarkdown>
    )

    expect(renderWikiLink).toHaveBeenCalledWith(expect.objectContaining({
      alias: 'Alias',
      href: '/Page',
      path: 'Page',
      permalink: 'Page'
    }))
    expect(container.querySelector('[data-href="/Page"]')?.textContent).toBe('Alias')
  })

  test('passes note embed metadata to a custom renderer', () => {
    const renderNoteEmbed = vi.fn(({href, path, permalink}) => (
      <aside data-href={href} data-path={path} data-permalink={permalink}>custom embed</aside>
    ))
    const ofm = createOfmReactMarkdown({
      components: {renderNoteEmbed},
      ofm: {embeds: true}
    })

    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'![[Project Notes]]'}
      </ReactMarkdown>
    )

    expect(renderNoteEmbed).toHaveBeenCalledWith(expect.objectContaining({
      href: '/Project%20Notes',
      path: 'Project Notes',
      permalink: 'Project Notes'
    }))
    expect(container.querySelector('aside')?.textContent).toContain('custom embed')
  })

  test('preserves regular react-markdown components alongside OFM renderers', () => {
    const ofm = createOfmReactMarkdown({
      components: {
        renderWikiLink({children, href}) {
          return <span data-kind="wikilink" data-href={href}>{children}</span>
        }
      },
      ofm: {wikilinks: true},
      reactComponents: {
        code({children}) {
          return <code data-kind="code">{children}</code>
        }
      }
    })

    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'[[Page]] and `inline code`'}
      </ReactMarkdown>
    )

    expect(container.querySelector('[data-kind="wikilink"]')?.textContent).toBe('Page')
    expect(container.querySelector('code[data-kind="code"]')?.textContent).toBe('inline code')
  })

  test('keeps external embeds on the default HTML path', () => {
    const ofm = createOfmReactMarkdown({components: {}})
    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'![](https://www.youtube.com/watch?v=dQw4w9WgXcQ)\n\n![](https://x.com/jack/status/20)'}
      </ReactMarkdown>
    )

    const iframe = container.querySelector('iframe[data-ofm-provider="youtube"]')
    const blockquote = container.querySelector('blockquote[data-ofm-provider="twitter"]')

    expect(iframe?.getAttribute('src')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(blockquote?.querySelector('a')?.getAttribute('href')).toBe('https://twitter.com/jack/status/20')
  })

  test('keeps non-OFM anchors and note embeds on the default HTML path', () => {
    const ofm = createOfmReactMarkdown({components: {}})
    const components = createOfmComponents()

    const {container} = render(
      <>
        <ReactMarkdown components={components}>{'[plain](https://example.com)'}</ReactMarkdown>
        <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
          {'![[Project Notes]]'}
        </ReactMarkdown>
      </>
    )

    expect(container.querySelector('a[href="https://example.com"]')).not.toBeNull()
    expect(container.querySelector('.ofm-embed a')).not.toBeNull()
  })
})
