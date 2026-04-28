import {createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider} from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, test} from 'vitest'

import {demoMarkdownPreset} from '../src/features/markdown/demo-markdown.js'

const rootRoute = createRootRoute()
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/'
})
const router = createRouter({
  history: createMemoryHistory({initialEntries: ['/']}),
  routeTree: rootRoute.addChildren([indexRoute])
})

function renderDemoMarkdown(markdown: string): HTMLDivElement {
  const markup = renderToStaticMarkup(
    <RouterContextProvider router={router}>
      <ReactMarkdown
        components={demoMarkdownPreset.components}
        rehypePlugins={demoMarkdownPreset.rehypePlugins}
        remarkPlugins={demoMarkdownPreset.remarkPlugins}
      >
        {markdown}
      </ReactMarkdown>
    </RouterContextProvider>
  )

  const container = document.createElement('div')
  container.innerHTML = markup
  return container
}

describe('demo note embed integration', () => {
  test('renders routed wikilinks and callouts through the demo-local adapter', () => {
    const container = renderDemoMarkdown([
      '[[Project Notes|Open note]]',
      '',
      '> [!note] Note title',
      '> Basic callout body.'
    ].join('\n'))

    expect(container.querySelector('a[href="/wiki/Project%20Notes"]')?.textContent).toBe('Open note')
    expect(container.querySelector('.ofm-callout')).not.toBeNull()
    expect(container.querySelector('blockquote')).toBeNull()
  })

  test('expands whole-page, heading, and block note embeds', () => {
    const container = renderDemoMarkdown([
      '![[Project Notes]]',
      '',
      '![[Project Notes#Overview]]',
      '',
      '![[Roadmap#^next-step]]'
    ].join('\n'))

    const embeds = [...container.querySelectorAll('.note-embed')]
    expect(embeds).toHaveLength(3)

    expect(embeds[0]?.querySelector('.note-embed__header strong')?.textContent).toBe('Project Notes')
    expect(embeds[0]?.querySelector('.note-embed__body h1')).toBeNull()
    expect(embeds[0]?.querySelector('.note-embed__body h2')?.textContent).toBe('Overview')

    expect(embeds[1]?.querySelector('.note-embed__header strong')?.textContent).toBe('Project Notes#Overview')
    expect(embeds[1]?.querySelector('.note-embed__body h2')?.textContent).toBe('Overview')
    expect(embeds[1]?.textContent).not.toContain('Navigation')

    expect(embeds[2]?.querySelector('.note-embed__header strong')?.textContent).toBe('Roadmap#^next-step')
    expect(embeds[2]?.querySelector('.note-embed__body h2')).toBeNull()
    expect(embeds[2]?.textContent).toContain('Finish real wiki navigation, keep heading anchors stable, and make block references scroll correctly.')
  })

  test('falls back to links for over-deep embeds and missing pages', () => {
    const recursive = renderDemoMarkdown('![[Recursive Embed]]')
    expect(recursive.querySelectorAll('.note-embed')).toHaveLength(2)
    expect(recursive.querySelector('a[href="/wiki/Recursive%20Embed"]')?.textContent).toBe('Recursive Embed')

    const deep = renderDemoMarkdown('![[Depth One]]')
    expect(deep.querySelectorAll('.note-embed')).toHaveLength(2)
    expect(deep.querySelector('a[href="/wiki/Depth%20Three"]')?.textContent).toBe('Depth Three')

    const missing = renderDemoMarkdown('![[Missing Page]]')
    expect(missing.querySelectorAll('.note-embed')).toHaveLength(0)
    expect(missing.querySelector('a[href="/wiki/Missing%20Page"]')?.textContent).toBe('Missing Page')
  })
})
