import type {Components} from 'react-markdown'
import { createElement, useMemo } from 'react'
import { Link } from '@tanstack/react-router'

import rehypeKatex from 'rehype-katex'
import ReactMarkdown from 'react-markdown'
import type {PluggableList} from 'unified'
import {
  createOfmReactMarkdown,
  type OfmMarkdownOptions
} from 'mdian/react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

import { getDemoWikiEmbed } from '../wiki/wiki.js'

interface DemoMarkdownPreset {
  components?: Components
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
}

export function createDemoMarkdownPreset(ofm: OfmMarkdownOptions = {}): DemoMarkdownPreset {
  return createDemoMarkdownPresetWithContext(ofm, { embedDepth: 0, embedTrail: [] })
}

interface DemoMarkdownPresetContext {
  // Track nested note embeds so the demo can stop deep or recursive rendering.
  embedDepth: number
  embedTrail: string[]
}

function createDemoMarkdownPresetWithContext(
  ofm: OfmMarkdownOptions,
  { embedDepth, embedTrail }: DemoMarkdownPresetContext
): DemoMarkdownPreset {
  const mdian = createOfmReactMarkdown({
    components: {
      renderWikiLink({ children, className, href }) {
        const wikiHref = prefixWikiHref(href)
        return createElement(Link, { className, to: wikiHref ?? href ?? '/' }, children)
      },
      renderNoteEmbed({ className, href, path, permalink, title }) {
        return createElement(NoteEmbed, {
          className,
          embedDepth,
          embedTrail,
          fallbackHref: href,
          ofm,
          path,
          permalink,
          title: title ?? ''
        })
      }
    },
    ofm
  })

  return {
    components: mdian.components,
    remarkPlugins: [
      remarkGfm,
      remarkMath,
      mdian.remarkPlugin
    ],
    rehypePlugins: [
      rehypeKatex,
      mdian.rehypePlugin
    ]
  }
}

function NoteEmbed({
  className,
  embedDepth,
  embedTrail,
  fallbackHref,
  ofm,
  path,
  permalink,
  title
}: {
  className?: string
  embedDepth: number
  embedTrail: string[]
  fallbackHref?: string
  ofm: OfmMarkdownOptions
  path: string
  permalink: string
  title: string
}) {
  const identity = permalink || path
  const isRecursive = embedTrail.includes(identity)
  const isTooDeep = embedDepth >= 2
  const embed = getDemoWikiEmbed(path, permalink)
  const nextTrail = [...embedTrail, identity]
  const preset = useMemo(
    () => createDemoMarkdownPresetWithContext(ofm, { embedDepth: embedDepth + 1, embedTrail: nextTrail }),
    [embedDepth, nextTrail, ofm]
  )

  if (!embed || isRecursive || isTooDeep) {
    const wikiHref = prefixWikiHref(fallbackHref)

    return createElement(
      'div',
      { className },
      createElement('a', { href: wikiHref }, title || permalink || path)
    )
  }

  return createElement(
    'section',
    { className: `${className ?? ''} note-embed`.trim() },
    createElement(
      'header',
      { className: 'note-embed__header' },
      createElement('strong', undefined, embed.title)
    ),
    createElement(
      'div',
      { className: 'note-embed__body' },
      createElement(
        ReactMarkdown,
        {
          components: preset.components,
          rehypePlugins: preset.rehypePlugins,
          remarkPlugins: preset.remarkPlugins
        },
        embed.markdown
      )
    )
  )
}

function prefixWikiHref(href: string | undefined): string | undefined {
  if (!href || !href.startsWith('/')) {
    return href
  }

  if (href === '/wiki' || href.startsWith('/wiki/')) {
    return href
  }

  return `/wiki${href}`
}
