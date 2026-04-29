import assert from 'node:assert/strict'
import test from 'node:test'
import {readFile} from 'node:fs/promises'

import {act, createElement, StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import ReactMarkdown from 'react-markdown'
import {renderToStaticMarkup} from 'react-dom/server'

import {createOfmReactPreset, loadTwitterWidgets} from '../src/react/index.js'
import type {LoadTwitterWidgetsInput, OfmReactPresetOptions, TwitterWidgetsApi} from '../src/react/index.js'
import {TwitterEmbedCard} from '../src/react/external-embed.js'
import {
  guardOfmNoteEmbed,
  resolveOfmNoteEmbedBody
} from '../src/react/note-embed.js'

function renderWithPreset(markdown: string, options: OfmReactPresetOptions = {}) {
  const preset = createOfmReactPreset(options)

  return renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        components: preset.components,
        rehypePlugins: preset.rehypePlugins,
        remarkPlugins: preset.remarkPlugins
      },
      markdown
    )
  )
}

test('createOfmReactPreset returns a react-markdown preset shape', () => {
  const preset = createOfmReactPreset()

  assert.ok(Array.isArray(preset.remarkPlugins))
  assert.ok(Array.isArray(preset.rehypePlugins))
  assert.equal(typeof preset.components.a, 'function')
  assert.equal(typeof preset.components.div, 'function')
  assert.equal(typeof preset.components.img, 'function')
})

test('createOfmReactPreset resolves wikilinks through wikiLink.resolve and wikiLink.render', () => {
  let renderHref = ''
  const html = renderWithPreset('[[Project Notes|Open note]]', {
    wikiLink: {
      resolve(target) {
        assert.deepEqual(target, {
          path: 'Project Notes'
        })

        return {
          href: '/wiki/Project%20Notes',
          title: 'Project Notes'
        }
      },
      render({children, className, href, resolved, target, title}) {
        renderHref = href
        assert.deepEqual(target, {path: 'Project Notes'})
        assert.deepEqual(resolved, {
          href: '/wiki/Project%20Notes',
          title: 'Project Notes'
        })

        return createElement('a', {
          className,
          'data-router-link': '',
          href,
          title
        }, children)
      }
    }
  })

  assert.equal(renderHref, '/wiki/Project%20Notes')
  assert.match(html, /data-router-link=""/)
  assert.match(html, /href="\/wiki\/Project%20Notes"/)
  assert.match(html, />Open note<\/a>/)
})

test('createOfmReactPreset rewrites ordinary markdown image src values through image.transformSrc', () => {
  const html = renderWithPreset('![hero](assets/image.svg)', {
    image: {
      transformSrc(src) {
        return `/static/${src}`
      }
    }
  })

  assert.match(html, /<img[^>]*src="\/static\/assets\/image\.svg"/)
})



test('createOfmReactPreset keeps note embeds out of paragraph wrappers', () => {
  const html = renderWithPreset('Before\n\n![[Project Notes]]\n\nAfter', {
    noteEmbed: {
      resolve(target) {
        assert.deepEqual(target, {path: 'Project Notes'})

        return {
          markdown: ['# Project Notes', '', 'Intro paragraph.'].join('\n'),
          title: 'Project Notes'
        }
      }
    },
    wikiLink: {
      resolve(target) {
        return {
          href: `/wiki/${encodeURIComponent(target.path)}`,
          title: target.path
        }
      }
    }
  })

  assert.match(html, /class="[^"]*note-embed[^"]*"/)
  assert.doesNotMatch(html, /<p><section/)
  assert.doesNotMatch(html, /<p><div[^>]*class="[^"]*note-embed/)
})

test('resolveOfmNoteEmbedBody resolves heading and block fragments from the React target model', () => {
  const headingMarkdown = [
    '# Project Notes',
    '',
    'Intro paragraph.',
    '',
    '## Overview',
    '',
    'Overview content.',
    '',
    '### Detail',
    '',
    'Nested content.',
    '',
    '## Navigation',
    '',
    'Navigation content.'
  ].join('\n')

  assert.deepEqual(resolveOfmNoteEmbedBody({
    markdown: headingMarkdown,
    target: {
      fragment: 'Overview',
      path: 'Project Notes'
    }
  }), {
    kind: 'heading',
    markdown: [
      '## Overview',
      '',
      'Overview content.',
      '',
      '### Detail',
      '',
      'Nested content.'
    ].join('\n')
  })

  const blockMarkdown = [
    '# Roadmap',
    '',
    'Finish the current milestone. ^next-step',
    '',
    'Follow-up paragraph.'
  ].join('\n')

  assert.deepEqual(resolveOfmNoteEmbedBody({
    markdown: blockMarkdown,
    target: {
      blockId: 'next-step',
      path: 'Roadmap'
    }
  }), {
    kind: 'block',
    markdown: 'Finish the current milestone. ^next-step'
  })
})

test('resolveOfmNoteEmbedBody preserves the full block around a block ref marker', () => {
  const markdown = [
    '# Roadmap',
    '',
    '- Ship the React preset this cycle.',
    '  Keep pure unified users off React installs.',
    '  Finish release notes before tagging. ^next-step',
    '',
    'Follow-up paragraph.'
  ].join('\n')

  assert.deepEqual(resolveOfmNoteEmbedBody({
    markdown,
    target: {
      blockId: 'next-step',
      path: 'Roadmap'
    }
  }), {
    kind: 'block',
    markdown: [
      '- Ship the React preset this cycle.',
      '  Keep pure unified users off React installs.',
      '  Finish release notes before tagging. ^next-step'
    ].join('\n')
  })
})

test('package metadata exposes mdian/react as a 0.1.0 optional-peer release', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as {
    exports: Record<string, {import?: string}>
    peerDependencies: Record<string, string>
    peerDependenciesMeta?: Record<string, {optional?: boolean}>
    version: string
  }

  assert.equal(packageJson.version, '0.1.0')
  assert.equal(packageJson.exports['./react']?.import, './dist/src/react/index.js')
  assert.equal(packageJson.peerDependencies.react, '^19.0.0')
  assert.equal(packageJson.peerDependencies['react-markdown'], '^10.0.0')
  assert.equal(packageJson.peerDependenciesMeta?.react?.optional, true)
  assert.equal(packageJson.peerDependenciesMeta?.['react-markdown']?.optional, true)
})

test('guardOfmNoteEmbed starts at depth one for the first nested render and stops over maxDepth', () => {
  assert.deepEqual(guardOfmNoteEmbed({
    maxDepth: 5,
    state: {
      depth: 0
    }
  }), {
    allowRender: true,
    isTooDeep: false,
    nextState: {
      depth: 1
    }
  })

  assert.deepEqual(guardOfmNoteEmbed({
    maxDepth: 2,
    state: {
      depth: 2
    }
  }), {
    allowRender: false,
    isTooDeep: true,
    nextState: {
      depth: 3
    }
  })
})

test('createOfmReactPreset renders note embeds recursively and falls back to plain links when unresolved or too deep', () => {
  const pages = new Map([
    ['Project Notes', {
      markdown: ['# Project Notes', '', 'Intro paragraph.', '', '## Overview', '', 'Overview content.'].join('\n'),
      title: 'Project Notes'
    }],
    ['Depth One', {
      markdown: ['# Depth One', '', '![[Depth Two]]'].join('\n'),
      title: 'Depth One'
    }],
    ['Depth Two', {
      markdown: ['# Depth Two', '', '![[Depth Three]]'].join('\n'),
      title: 'Depth Two'
    }],
    ['Depth Three', {
      markdown: ['# Depth Three', '', 'Reached the fallback boundary.'].join('\n'),
      title: 'Depth Three'
    }]
  ])

  const resolved = renderWithPreset(['![[Project Notes]]', '', '![[Project Notes#Overview]]', '', '![[Missing Page]]', '', '![[Depth One]]'].join('\n'), {
    noteEmbed: {
      maxDepth: 2,
      resolve(target) {
        const page = pages.get(target.path)
        return page ? {
          markdown: page.markdown,
          title: page.title
        } : undefined
      }
    },
    wikiLink: {
      resolve(target) {
        return {
          href: `/wiki/${encodeURIComponent(target.path)}`,
          title: target.path
        }
      }
    }
  })

  assert.match(resolved, /class="[^"]*note-embed[^"]*"/)
  assert.match(resolved, />Project Notes<\/strong>/)
  assert.match(resolved, />Project Notes#Overview<\/strong>/)
  assert.match(resolved, /href="\/wiki\/Missing%20Page"/)
  assert.match(resolved, /href="\/wiki\/Depth%20Three"/)
})

test('createOfmReactPreset keeps twitter embeds on a static fallback path by default', () => {
  const html = renderWithPreset('![](https://x.com/jack/status/20)')

  assert.match(html, /data-ofm-provider="twitter"/)
  assert.match(html, /class="[^"]*ofm-external-embed[^"]*"/)
  assert.doesNotMatch(html, /class="[^"]*ofm-embed[^"]*"/)
  assert.match(html, /View post on X/)
  assert.match(html, /href="https:\/\/twitter\.com\/jack\/status\/20"/)
  assert.doesNotMatch(html, /data-twitter-enhanced="true"/)
})

test('TwitterEmbedCard renders a visible fallback link during SSR when enhancement is enabled', () => {
  const html = renderToStaticMarkup(
    createElement(TwitterEmbedCard, {
      data: {
        href: 'https://twitter.com/jack/status/20',
        tweetId: '20'
      },
      options: {
        enhance: true
      }
    })
  )

  assert.match(html, /View post on X/)
  assert.match(html, /href="https:\/\/twitter\.com\/jack\/status\/20"/)
  assert.doesNotMatch(html, /data-twitter-enhanced="true"/)
})

test('createOfmReactPreset keeps youtube embeds on the rehype iframe path', () => {
  const html = renderWithPreset('![](https://www.youtube.com/watch?v=dQw4w9WgXcQ)')

  assert.match(html, /<iframe/)
  assert.match(html, /class="[^"]*ofm-external-embed[^"]*"/)
  assert.doesNotMatch(html, /class="[^"]*ofm-embed[^"]*"/)
  assert.match(html, /youtube\.com\/embed\/dQw4w9WgXcQ/)
  assert.match(html, /data-ofm-provider="youtube"/)
})

test('TwitterEmbedCard renders React loading text before enhancement and falls back to a link on failure', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalHTMLElement = globalThis.HTMLElement
  const originalNode = globalThis.Node
  const originalMutationObserver = globalThis.MutationObserver
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const actEnvironmentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')

  const specifier: string = 'jsdom'
  const {JSDOM} = await import(specifier)
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/'
  })
  const {window} = dom

  globalThis.window = window
  globalThis.document = window.document
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Node = window.Node
  globalThis.MutationObserver = window.MutationObserver
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: window.navigator
  })
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true
  })

  try {
    const container = document.getElementById('app')
    assert.ok(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(TwitterEmbedCard, {
          data: {
            href: 'https://twitter.com/jack/status/20',
            tweetId: '20'
          },
          options: {
            enhance: true,
            loadScript: async () => {
              await new Promise((resolve) => setTimeout(resolve, 20))
              throw new Error('widgets unavailable')
            }
          }
        })
      )
    })

    assert.match(container.innerHTML, /Loading post…/)
    assert.doesNotMatch(container.innerHTML, /<div[^>]*><\/div>/)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30))
    })

    assert.match(container.innerHTML, /View post on X/)
    assert.match(container.innerHTML, /href="https:\/\/twitter\.com\/jack\/status\/20"/)
    assert.doesNotMatch(container.innerHTML, /data-twitter-enhanced="true"/)

    await act(async () => {
      root.unmount()
    })
  } finally {
    dom.window.close()
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    globalThis.HTMLElement = originalHTMLElement
    globalThis.Node = originalNode
    globalThis.MutationObserver = originalMutationObserver
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    }
    if (actEnvironmentDescriptor) {
      Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironmentDescriptor)
    }
  }
})

test('TwitterEmbedCard only calls createTweet once per mount under StrictMode', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalHTMLElement = globalThis.HTMLElement
  const originalNode = globalThis.Node
  const originalMutationObserver = globalThis.MutationObserver
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const actEnvironmentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')

  const specifier: string = 'jsdom'
  const {JSDOM} = await import(specifier)
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/'
  })
  const {window} = dom

  globalThis.window = window
  globalThis.document = window.document
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Node = window.Node
  globalThis.MutationObserver = window.MutationObserver
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: window.navigator
  })
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true
  })

  try {
    let calls = 0
    const container = document.getElementById('app')
    assert.ok(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(
          StrictMode,
          undefined,
          createElement(TwitterEmbedCard, {
            data: {
              href: 'https://twitter.com/jack/status/20',
              tweetId: '20'
            },
            options: {
              enhance: true,
              loadScript: async () => {
                await new Promise((resolve) => setTimeout(resolve, 20))
                return {
                  createTweet: async (_tweetId, element) => {
                    calls += 1
                    const iframe = document.createElement('iframe')
                    element.appendChild(iframe)
                    return iframe
                  }
                }
              }
            }
          })
        )
      )
    })

    assert.match(container.innerHTML, /Loading post…/)

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    await act(async () => {
      root.unmount()
    })

    assert.equal(calls, 1)
  } finally {
    dom.window.close()
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    globalThis.HTMLElement = originalHTMLElement
    globalThis.Node = originalNode
    globalThis.MutationObserver = originalMutationObserver
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    }
    if (actEnvironmentDescriptor) {
      Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironmentDescriptor)
    }
  }
})

test('TwitterEmbedCard keeps a loading label and uses the outer embed container as the host while enhancement is pending', async () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document
  const originalHTMLElement = globalThis.HTMLElement
  const originalNode = globalThis.Node
  const originalMutationObserver = globalThis.MutationObserver
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
  const actEnvironmentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT')

  const specifier: string = 'jsdom'
  const {JSDOM} = await import(specifier)
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/'
  })
  const {window} = dom

  globalThis.window = window
  globalThis.document = window.document
  globalThis.HTMLElement = window.HTMLElement
  globalThis.Node = window.Node
  globalThis.MutationObserver = window.MutationObserver
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: window.navigator
  })
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    configurable: true,
    value: true
  })

  try {
    const container = document.getElementById('app')
    assert.ok(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        createElement(TwitterEmbedCard, {
          data: {
            href: 'https://twitter.com/jack/status/20',
            tweetId: '20'
          },
          options: {
            enhance: true,
            loadScript: async () => new Promise<TwitterWidgetsApi>(() => {})
          }
        })
      )
    })

    const embed = container.querySelector('div[data-ofm-provider="twitter"]')
    assert.ok(embed)
    assert.equal(embed.firstElementChild?.tagName, 'P')
    assert.match(embed.innerHTML, /Loading post…/)
    assert.equal(embed.querySelector('div'), null)

    await act(async () => {
      root.unmount()
    })
  } finally {
    dom.window.close()
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    globalThis.HTMLElement = originalHTMLElement
    globalThis.Node = originalNode
    globalThis.MutationObserver = originalMutationObserver
    if (navigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', navigatorDescriptor)
    }
    if (actEnvironmentDescriptor) {
      Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actEnvironmentDescriptor)
    }
  }
})
