import type { Element } from 'hast'

import { Link } from '@tanstack/react-router'
import { ofmClassNames } from 'mdian'
import type { OfmRemarkOptions } from 'mdian'
import ReactMarkdown, { type Components } from 'react-markdown'
import { useMemo } from 'react'

import {
  buildRehypePlugins,
  buildRemarkPlugins,
  defaultDemoRehypeOptions,
  type DemoMarkdownFeatures
} from './markdown-pipeline.js'
import { defaultRemarkOptions } from './remark-options.js'
import { getDemoWikiEmbed } from './wiki.js'

interface MarkdownComponentsOptions {
  embedDepth?: number
  features?: DemoMarkdownFeatures
  remarkOptions?: OfmRemarkOptions
  embedTrail?: string[]
}

export function createMarkdownComponents(options: MarkdownComponentsOptions = {}): Components {
  const embedDepth = options.embedDepth ?? 0
  const embedTrail = options.embedTrail ?? []
  const features = options.features ?? {gfm: true, math: true}
  const remarkOptions = options.remarkOptions ?? defaultRemarkOptions

  return {
    a({ className, href, node: _node, ...props }) {
      const isWikiLink = className?.split(/\s+/).includes(ofmClassNames.wikilink) ?? false

      if (!isWikiLink) {
        return <a {...props} className={className} href={href} />
      }

      const wikiHref = prefixWikiHref(href)

      if (!wikiHref) {
        return <a {...props} className={className} href={href} />
      }

      return <Link {...props} className={className} to={wikiHref} />
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
          features={features}
          path={path}
          remarkOptions={remarkOptions}
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
  features,
  path,
  remarkOptions,
  permalink,
  title
}: {
  className?: string
  embedDepth: number
  embedTrail: string[]
  fallbackHref?: string
  features: DemoMarkdownFeatures
  path: string
  remarkOptions: OfmRemarkOptions
  permalink: string
  title: string
}) {
  const identity = permalink || path
  const isRecursive = embedTrail.includes(identity)
  const isTooDeep = embedDepth >= 2
  const embed = getDemoWikiEmbed(path, permalink)
  const nextTrail = [...embedTrail, identity]
  const markdownComponents = useMemo(
    () => createMarkdownComponents({ embedDepth: embedDepth + 1, embedTrail: nextTrail, features, remarkOptions }),
    [embedDepth, features, nextTrail, remarkOptions]
  )
  const remarkPlugins = useMemo(() => buildRemarkPlugins(remarkOptions, features), [features, remarkOptions])
  const rehypePlugins = useMemo(
    () => buildRehypePlugins(defaultDemoRehypeOptions, features),
    [features]
  )

  if (!embed || isRecursive || isTooDeep) {
    const wikiHref = prefixWikiHref(fallbackHref)

    return (
      <div className={className}>
        <a href={wikiHref}>{title || permalink || path}</a>
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
          rehypePlugins={rehypePlugins}
          remarkPlugins={remarkPlugins}
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

function prefixWikiHref(href: string | undefined): string | undefined {
  if (!href || !href.startsWith('/')) {
    return href
  }

  if (href === '/wiki' || href.startsWith('/wiki/')) {
    return href
  }

  return `/wiki${href}`
}
