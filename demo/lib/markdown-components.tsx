import type {Element} from 'hast'

import {Link} from '@tanstack/react-router'
import {ofmClassNames, rehypeOfm, remarkOfm} from 'mdian'
import ReactMarkdown, {type Components} from 'react-markdown'
import {useMemo} from 'react'

import {getDemoWikiEmbed} from './wiki.js'

interface MarkdownComponentsOptions {
  embedDepth?: number
  embedTrail?: string[]
}

export function createMarkdownComponents(options: MarkdownComponentsOptions = {}): Components {
  const embedDepth = options.embedDepth ?? 0
  const embedTrail = options.embedTrail ?? []

  return {
    a({ className, href, node: _node, ...props }) {
      const isWikiLink = className?.split(/\s+/).includes(ofmClassNames.wikilink) ?? false

      if (!isWikiLink) {
        return <a {...props} className={className} href={href} />
      }

      return <Link {...props} className={className} to={href} />
    },
    div({ className, node, children, ...props }) {
      const classes = className?.split(/\s+/) ?? []
      const isEmbed = classes.includes(ofmClassNames.embed)
      const properties = node?.properties ?? {}
      const embedType = readString(properties.dataOfmEmbed ?? properties['data-ofm-embed'])

      if (!isEmbed || embedType !== 'note') {
        return <div {...props} className={className}>{children}</div>
      }

      const path = readString(properties['data-ofm-path-public'] ?? properties.dataOfmPath ?? properties['data-ofm-path'])
      const permalink = readString(properties['data-ofm-permalink-public'] ?? properties.dataOfmPermalink ?? properties['data-ofm-permalink'])
      const title = readString(properties.title)

      return (
        <NoteEmbed
          className={className}
          embedDepth={embedDepth}
          embedTrail={embedTrail}
          fallbackHref={readFallbackHref(node)}
          path={path}
          permalink={permalink}
          title={title}
        />
      )
    }
  }
}

function NoteEmbed({
  className,
  embedDepth,
  embedTrail,
  fallbackHref,
  path,
  permalink,
  title
}: {
  className?: string
  embedDepth: number
  embedTrail: string[]
  fallbackHref?: string
  path: string
  permalink: string
  title: string
}) {
  const identity = permalink || path
  const isRecursive = embedTrail.includes(identity)
  const isTooDeep = embedDepth >= 2
  const embed = getDemoWikiEmbed(path, permalink)
  const nextTrail = [...embedTrail, identity]
  const markdownComponents = useMemo(
    () => createMarkdownComponents({embedDepth: embedDepth + 1, embedTrail: nextTrail}),
    [embedDepth, nextTrail]
  )

  if (!embed || isRecursive || isTooDeep) {
    return (
      <div className={className}>
        <a href={fallbackHref}>{title || permalink || path}</a>
      </div>
    )
  }

  return (
    <section className={`${className ?? ''} note-embed`.trim()}>
      <header className="note-embed__header">
        <strong>{embed.title}</strong>
      </header>
      <div className="note-embed__body">
        <ReactMarkdown
          components={markdownComponents}
          rehypePlugins={[[rehypeOfm, {hrefPrefix: 'wiki', renderBlockAnchorLabels: true}]]}
          remarkPlugins={[[remarkOfm, {embeds: true, highlights: true, wikilinks: true}]]}
        >
          {embed.markdown}
        </ReactMarkdown>
      </div>
    </section>
  )
}

function readFallbackHref(node: Element | undefined): string | undefined {
  const firstChild = node?.children?.[0]

  if (!firstChild || firstChild.type !== 'element') {
    return undefined
  }

  if (firstChild.tagName !== 'a') {
    return undefined
  }

  const href = firstChild.properties?.href
  return typeof href === 'string' ? href : undefined
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
