import {createMemoryHistory, createRootRoute, createRoute, createRouter, RouterContextProvider} from '@tanstack/react-router'
import ReactMarkdown from 'react-markdown'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'

import {
  buildDemoWikiHref,
  buildDemoWikiSlug,
  getDemoWikiPageBySlug,
} from '../src/content/demo-content.js'
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
    expect(recursive.querySelector('a[href="/wiki/recursive-embed"]')?.textContent).toBe('Recursive Embed')

    const deep = renderDemoMarkdown('![[Depth One]]')
    expect(deep.querySelectorAll('.note-embed')).toHaveLength(2)
    expect(deep.querySelector('a[href="/wiki/depth-three"]')?.textContent).toBe('Depth Three')

    const missing = renderDemoMarkdown('![[Missing Page]]')
    expect(missing.querySelectorAll('.note-embed')).toHaveLength(0)
    expect(missing.querySelector('a[href="/wiki/missing-page"]')?.textContent).toBe('Missing Page')
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

  test('builds and resolves demo wiki routes by slug while preserving fragments', () => {
    expect(buildDemoWikiSlug('Project Notes')).toBe('project-notes')
    expect(buildDemoWikiSlug('Folder Name/Page Name')).toBe('folder-name/page-name')
    expect(buildDemoWikiSlug('学习/first-map')).toBe('学习/first-map')
    expect(buildDemoWikiHref('Folder Name/Page Name', 'Heading Here')).toBe('/wiki/folder-name/page-name#heading-here')
    expect(buildDemoWikiHref('学习/first-map', '学习 地图')).toBe('/wiki/学习/first-map#学习-地图')
    expect(getDemoWikiPageBySlug('folder-name/page-name')?.path).toBe('Folder Name/Page Name')
    expect(getDemoWikiPageBySlug('project-notes')?.title).toBe('Project Notes')
  })
})
