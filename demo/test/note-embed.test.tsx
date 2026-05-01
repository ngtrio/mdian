import {createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider} from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {getDemoWikiPageBySlug} from '../src/demo-content.js'
import {demoMarkdownPreset} from '../src/demo-markdown.js'

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

const originalBaseUrl = import.meta.env.BASE_URL

beforeEach(() => {
  vi.stubEnv('BASE_URL', originalBaseUrl)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('demo note embed integration', () => {
  test('renders routed wikilinks and callouts through the mdian react preset', () => {
    const container = renderDemoMarkdown([
      '[[Project Notes|Open note]]',
      '[[Project Notes#Overview#Detail|Nested target]]',
      '[[Roadmap#^next-step|Block target]]',
      '',
      '> [!note] Note title',
      '> Basic callout body.'
    ].join('\n'))

    expect(container.querySelector('a[href="/wiki/project-notes"]')?.textContent).toBe('Open note')
    expect(container.querySelector('a[href="/wiki/project-notes#overview#detail"]')?.textContent).toBe('Nested target')
    expect(container.querySelector('a[href="/wiki/roadmap#^next-step"]')?.textContent).toBe('Block target')
    expect(container.querySelector('.ofm-callout')).not.toBeNull()
    expect(container.querySelector('blockquote')).toBeNull()
  })

  test('renders native id anchor targets that match canonical wikilink hashes', () => {
    const container = renderDemoMarkdown([
      '# Project Notes',
      '',
      '## Overview',
      '',
      '### Detail',
      '',
      'Target paragraph. ^next-step',
      '',
      '[[Project Notes#Overview#Detail|Nested target]]',
      '[[Project Notes#^next-step|Block target]]'
    ].join('\n'))

    expect(container.querySelector('h2[id="overview"]')).not.toBeNull()
    expect(container.querySelector('h3[id="overview#detail"]')).not.toBeNull()
    expect(container.querySelector('p[id="^next-step"]')).not.toBeNull()
    expect(container.querySelector('a[href="/wiki/project-notes#overview#detail"]')).not.toBeNull()
    expect(container.querySelector('a[href="/wiki/project-notes#^next-step"]')).not.toBeNull()
  })

  test('rewrites ordinary markdown image sources through the preset image.transformSrc hook', () => {
    const container = renderDemoMarkdown('![hero](assets/image.svg)')
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/assets/image.svg')
  })

  test('keeps demo asset image sources under the active base path', () => {
    vi.stubEnv('BASE_URL', '/mdian/')

    const container = renderDemoMarkdown('![hero](assets/image.svg)')

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/mdian/assets/image.svg')
  })

  test('keeps OFM image embed sources under the active base path', () => {
    vi.stubEnv('BASE_URL', '/mdian/')

    const container = renderDemoMarkdown('![[assets/image.svg|320x180]]')

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/mdian/assets/image.svg')
  })

  test('expands note embeds when followed by paragraph content', () => {
    const container = renderDemoMarkdown('![[Project Notes]]\nfollowing text')

    expect(container.querySelectorAll('.note-embed')).toHaveLength(1)
    expect(container.querySelector('.note-embed')?.parentElement).toBe(container)
    expect(container.querySelector('p:last-child')?.textContent).toBe('\nfollowing text')
  })

  test('expands whole-page, heading, nested-heading, and block note embeds', () => {
    const container = renderDemoMarkdown([
      '![[Project Notes]]',
      '',
      '![[Project Notes#Overview]]',
      '',
      '![[Project Notes#Overview#Detail]]',
      '',
      '![[Roadmap#^next-step]]'
    ].join('\n'))

    const embeds = [...container.querySelectorAll('.note-embed')]
    expect(embeds).toHaveLength(4)
    expect(embeds[0]?.querySelector('.note-embed__header strong')?.textContent).toBe('Project Notes')
    expect(embeds[0]?.textContent).toContain('A working note for the demo knowledge base.')
    expect(embeds[1]?.querySelector('.note-embed__header strong')?.textContent).toBe('Project Notes#Overview')
    expect(embeds[1]?.textContent).toContain('This section is the destination for Project Notes in the mixed showcase example.')
    expect(embeds[1]?.textContent).not.toContain('## Navigation')
    expect(embeds[2]?.querySelector('.note-embed__header strong')?.textContent).toBe('Project Notes#Overview#Detail')
    expect(embeds[2]?.textContent).toContain('This nested heading is the destination for Project Notes and ![[Project Notes#Overview#Detail]].')
    expect(embeds[2]?.textContent).not.toContain('## Navigation')
    expect(embeds[3]?.querySelector('.note-embed__header strong')?.textContent).toBe('Roadmap#^next-step')
    expect(embeds[3]?.textContent).toContain('Finish real wiki navigation, keep heading anchors stable, and make block references scroll correctly.')
    expect(embeds[3]?.textContent).not.toContain('Tighten the final HTML contract')
  })

  test('falls back to links for over-deep embeds and missing pages', () => {
    const recursive = renderDemoMarkdown('![[Recursive Embed]]')
    expect(recursive.querySelectorAll('.note-embed')).toHaveLength(2)
    const recursiveFallback = [...recursive.querySelectorAll('a')].find((element) => element.textContent === 'Recursive Embed')
    expect(recursiveFallback?.getAttribute('href')).toBe('/wiki/recursive-embed')

    const deep = renderDemoMarkdown('![[Depth One]]')
    expect(deep.querySelectorAll('.note-embed')).toHaveLength(2)
    const depthFallback = [...deep.querySelectorAll('a')].find((element) => element.textContent === 'Depth Three')
    expect(depthFallback?.getAttribute('href')).toBe('/wiki/depth-three')

    const missing = renderDemoMarkdown('![[Missing Page]]')
    expect(missing.querySelectorAll('.note-embed')).toHaveLength(1)
    expect(missing.querySelector('.note-embed__header strong')?.textContent).toBe('Missing Page')
    expect(missing.textContent).toContain('This demo note could not be resolved.')
  })

  test('renders external tweet embeds through the dedicated tweet container path', () => {
    const container = renderDemoMarkdown('![](https://x.com/jack/status/20)')
    const tweet = container.querySelector('div[data-ofm-provider="twitter"]')

    expect(tweet).not.toBeNull()
    expect(tweet?.className).toContain('ofm-external-embed')
    expect(tweet?.className).not.toContain('ofm-embed')
    expect(tweet?.getAttribute('data-ofm-kind')).toBe('embed')
    expect(tweet?.getAttribute('data-ofm-variant')).toBe('external')
    expect(tweet?.textContent).toBe('')
    expect(tweet?.querySelector('div')).toBeNull()
    expect(tweet?.querySelector('p')).toBeNull()
  })

  test('resolves demo wiki routes by slug', () => {
    expect(getDemoWikiPageBySlug('folder-name/page-name')?.path).toBe('Folder Name/Page Name')
    expect(getDemoWikiPageBySlug('project-notes')?.title).toBe('Project Notes')
  })
})
