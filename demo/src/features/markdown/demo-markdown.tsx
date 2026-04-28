import type {Element, Properties} from 'hast'
import {Link} from '@tanstack/react-router'
import {createElement, type FunctionComponent, useEffect, useRef, type RefObject, type ReactNode} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type {Components} from 'react-markdown'
import type {Pluggable, PluggableList} from 'unified'
import {
  rehypeOfm,
  remarkOfm,
  type OfmRehypeOptions,
  type OfmRemarkOptions
} from 'mdian'

import {buildDemoWikiHref, getDemoWikiPage} from '../../content/demo-content.js'
import {OfmNoteEmbed, type OfmNoteEmbedPage} from './note-embed.js'

interface DemoMarkdownPreset {
  components?: Components
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
}

interface DemoMarkdownProps {
  className?: string
  contentKey?: string
  markdown: string
}

interface OfmRendererProps {
  children?: ReactNode
  className?: string | undefined
  href?: string | undefined
}

interface OfmWikiLinkRendererProps extends OfmRendererProps {}

interface OfmTargetRendererProps extends OfmRendererProps {
  blockId?: string | undefined
  fragment?: string | undefined
  path: string
  permalink: string
}

interface OfmNoteEmbedRendererProps extends OfmTargetRendererProps {
  title?: string | undefined
}

interface CreateOfmComponentsOptions {
  renderNoteEmbed?: FunctionComponent<OfmNoteEmbedRendererProps>
  renderWikiLink?: FunctionComponent<OfmWikiLinkRendererProps>
}

interface OfmWikiLinkData {
  kind: 'wikilink'
  path: string
  permalink: string
}

interface OfmNoteEmbedData {
  blockId?: string | undefined
  fragment?: string | undefined
  kind: 'embed'
  path: string
  permalink: string
  variant: 'note'
}

type OfmMarkdownOptions = OfmRemarkOptions & OfmRehypeOptions

const twitterScriptId = 'demo-twitter-widgets'
const twitterScriptSrc = 'https://platform.twitter.com/widgets.js'

export const demoMarkdownPreset = createDemoMarkdownPreset()

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load?: (element?: HTMLElement) => void
      }
    }
  }
}

export function DemoMarkdown({className, contentKey, markdown}: DemoMarkdownProps) {
  const rootRef = useRef<HTMLElement>(null)

  useDemoExternalEmbeds(rootRef, contentKey ?? markdown)

  return (
    <article className={className} ref={rootRef}>
      <ReactMarkdown
        components={demoMarkdownPreset.components}
        rehypePlugins={demoMarkdownPreset.rehypePlugins}
        remarkPlugins={demoMarkdownPreset.remarkPlugins}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}

function createDemoMarkdownPreset(ofm: OfmMarkdownOptions = {}): DemoMarkdownPreset {
  const {
    callouts,
    comments,
    embeds,
    externalEmbeds,
    highlights,
    hrefPrefix,
    renderBlockAnchorLabels,
    setTitle,
    wikilinks
  } = ofm
  const remarkPlugin: Pluggable = [remarkOfm, compactDefined({
    ...(callouts === undefined ? {} : {callouts}),
    ...(comments === undefined ? {} : {comments}),
    ...(embeds === undefined ? {} : {embeds}),
    ...(highlights === undefined ? {} : {highlights}),
    ...(wikilinks === undefined ? {} : {wikilinks})
  })]
  const rehypePlugin: Pluggable = [rehypeOfm, compactDefined({
    ...(externalEmbeds === undefined ? {} : {externalEmbeds}),
    ...(hrefPrefix === undefined ? {} : {hrefPrefix}),
    ...(renderBlockAnchorLabels === undefined ? {} : {renderBlockAnchorLabels}),
    ...(setTitle === undefined ? {} : {setTitle})
  })]
  let ofmComponents: Components | undefined
  const renderWikiLink: FunctionComponent<OfmWikiLinkRendererProps> = ({children, className, href}) => {
    const wikiHref = prefixWikiHref(href)
    return createElement(Link, {className, to: wikiHref ?? href ?? '/'}, children)
  }
  const renderNoteEmbed = createNoteEmbedRenderer({
    getComponents: () => ofmComponents,
    rehypePlugin,
    remarkPlugin,
    renderWikiLink,
    resolvePage: getDemoWikiPage
  })
  ofmComponents = createOfmComponents({renderNoteEmbed, renderWikiLink})

  return {
    components: {
      ...ofmComponents,
      img({src, ...props}) {
        return createElement('img', {
          ...props,
          ...(typeof src === 'string' ? {src: resolveDemoAssetHref(src)} : {})
        })
      }
    },
    remarkPlugins: [remarkGfm, remarkMath, remarkPlugin],
    rehypePlugins: [rehypeKatex, rehypePlugin]
  }
}

function useDemoExternalEmbeds(
  containerRef: RefObject<HTMLElement | null>,
  contentKey: string
) {
  useEffect(() => {
    const root = containerRef.current

    if (!root || !root.querySelector('blockquote.twitter-tweet')) {
      return
    }

    let disposed = false
    const loadWidgets = () => {
      if (!disposed) {
        window.twttr?.widgets?.load?.(root)
      }
    }

    if (window.twttr?.widgets?.load) {
      loadWidgets()
      return
    }

    const existingScript = document.getElementById(twitterScriptId)

    if (existingScript instanceof HTMLScriptElement) {
      existingScript.addEventListener('load', loadWidgets)

      return () => {
        disposed = true
        existingScript.removeEventListener('load', loadWidgets)
      }
    }

    const script = document.createElement('script')
    script.id = twitterScriptId
    script.src = twitterScriptSrc
    script.async = true
    script.charset = 'utf-8'
    script.addEventListener('load', loadWidgets)
    document.body.append(script)

    return () => {
      disposed = true
      script.removeEventListener('load', loadWidgets)
    }
  }, [containerRef, contentKey])
}

interface CreateNoteEmbedRendererOptions {
  getComponents: () => Components | undefined
  rehypePlugin: Pluggable
  remarkPlugin: Pluggable
  renderWikiLink: FunctionComponent<OfmWikiLinkRendererProps>
  resolvePage: (path: string) => OfmNoteEmbedPage | undefined
}

function createNoteEmbedRenderer(
  options: CreateNoteEmbedRendererOptions
): FunctionComponent<OfmNoteEmbedRendererProps> {
  const {
    getComponents,
    rehypePlugin,
    remarkPlugin,
    renderWikiLink,
    resolvePage
  } = options

  return function DemoNoteEmbedRenderer({className, href, path, permalink, title}) {
    return createElement(OfmNoteEmbed, {
      renderBody({markdown}) {
        return createElement(
          ReactMarkdown,
          {
            components: getComponents(),
            rehypePlugins: [rehypePlugin],
            remarkPlugins: [remarkPlugin]
          },
          markdown
        )
      },
      renderFallback({label, target}) {
        return createElement(renderWikiLink, {
          className,
          href: target.href ?? buildDemoWikiHref(target.path, readPermalinkFragment(target.permalink)),
          children: label
        })
      },
      resolvePage,
      target: {
        path,
        permalink,
        ...(href === undefined ? {} : {href}),
        ...(title === undefined ? {} : {title})
      },
      ...(className === undefined ? {} : {className})
    })
  }
}

function createOfmComponents(options: CreateOfmComponentsOptions = {}): Components {
  const {renderNoteEmbed, renderWikiLink} = options

  return {
    a({children, className, href, node, ...props}) {
      const data = readOfmWikiLinkData(node)

      if (!data || !renderWikiLink) {
        return createElement('a', {...props, className, href}, children)
      }

      return renderWikiLink({
        children,
        className,
        href
      })
    },
    div({children, className, node, ...props}) {
      const data = readOfmNoteEmbedData(node)

      if (data && !renderNoteEmbed) {
        return createElement('span', {...props, className}, children)
      }

      if (!data) {
        return createElement('div', {...props, className}, children)
      }

      const href = readFallbackHref(node)
      const title = readTitle(node)

      return renderNoteEmbed!({
        children,
        path: data.path,
        permalink: data.permalink,
        blockId: data.blockId,
        className,
        fragment: data.fragment,
        href,
        title
      })
    }
  }
}

function readOfmWikiLinkData(node: Element | undefined): OfmWikiLinkData | undefined {
  const properties = node?.properties

  if (readOptionalString(properties, 'data-ofm-kind') !== 'wikilink') {
    return undefined
  }

  const path = readOptionalString(properties, 'data-ofm-path')
  const permalink = readOptionalString(properties, 'data-ofm-permalink')

  if (path === undefined || permalink === undefined) {
    return undefined
  }

  return {
    kind: 'wikilink',
    path,
    permalink
  }
}

function readOfmNoteEmbedData(node: Element | undefined): OfmNoteEmbedData | undefined {
  const properties = node?.properties

  if (readOptionalString(properties, 'data-ofm-kind') !== 'embed') {
    return undefined
  }

  if (readOptionalString(properties, 'data-ofm-variant') !== 'note') {
    return undefined
  }

  const path = readOptionalString(properties, 'data-ofm-path')
  const permalink = readOptionalString(properties, 'data-ofm-permalink')

  if (path === undefined || permalink === undefined) {
    return undefined
  }

  const blockId = readOptionalString(properties, 'data-ofm-block-id')
  const fragment = readOptionalString(properties, 'data-ofm-fragment')

  return {
    kind: 'embed',
    variant: 'note',
    path,
    permalink,
    ...(blockId === undefined ? {} : {blockId}),
    ...(fragment === undefined ? {} : {fragment})
  }
}

function readFallbackHref(node: Element | undefined): string | undefined {
  const firstChild = node?.children[0]

  if (!firstChild || firstChild.type !== 'element' || firstChild.tagName !== 'a') {
    return undefined
  }

  return readOptionalString(firstChild.properties, 'href')
}

function readTitle(node: Element | undefined): string | undefined {
  return readOptionalString(node?.properties, 'title')
}

function readOptionalString(properties: Properties | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' ? value : undefined
}

function compactDefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
  ) as T
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

function readPermalinkFragment(permalink: string): string | undefined {
  const hashIndex = permalink.indexOf('#')

  if (hashIndex === -1) {
    return undefined
  }

  return permalink.slice(hashIndex)
}

function resolveDemoAssetHref(href: string): string {
  if (!href.startsWith('/assets/')) {
    return href
  }

  const baseUrl = import.meta.env.BASE_URL

  if (!baseUrl || baseUrl === '/') {
    return href
  }

  return `${baseUrl.replace(/\/$/, '')}${href}`
}
