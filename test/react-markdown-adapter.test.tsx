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
