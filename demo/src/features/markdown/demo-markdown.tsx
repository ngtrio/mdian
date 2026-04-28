import type {Element, Properties} from 'hast'
import {Link} from '@tanstack/react-router'
import {
  createElement,
  type FunctionComponent,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react'
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

interface OfmExternalTweetData {
  href: string
  provider: 'twitter'
  tweetId: string
}

type OfmMarkdownOptions = OfmRemarkOptions & OfmRehypeOptions
type TwitterWidgetsApi = NonNullable<NonNullable<Window['twttr']>['widgets']>

export const demoMarkdownPreset = createDemoMarkdownPreset()

declare global {
  interface Window {
    twttr?: {
      ready?: (callback: (api: NonNullable<Window['twttr']>) => void) => void
      widgets?: {
        createTweet?: (
          tweetId: string,
          element: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement>
      }
    }
  }
}

let twitterWidgetsPromise: Promise<TwitterWidgetsApi> | undefined

export function DemoMarkdown({className, markdown}: DemoMarkdownProps) {
  return (
    <article className={className}>
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
    blockquote({children, className, node, ...props}) {
      const data = readOfmExternalTweetData(node)

      if (!data) {
        return createElement('blockquote', {...props, className}, children)
      }

      return createElement(TwitterEmbedCard, {
        className,
        href: data.href,
        title: readTitle(node),
        tweetId: data.tweetId
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

function TwitterEmbedCard({
  className,
  href,
  title,
  tweetId
}: {
  className?: string
  href: string
  title?: string
  tweetId: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [isEnhanced, setIsEnhanced] = useState(false)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    let cancelled = false
    setIsEnhanced(false)
    host.replaceChildren()

    void loadTwitterWidgets()
      .then((widgets) => widgets.createTweet?.(tweetId, host, {align: 'center', dnt: true}))
      .then((tweet) => {
        if (!cancelled && tweet) {
          setIsEnhanced(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          host.replaceChildren()
          setIsEnhanced(false)
        }
      })

    return () => {
      cancelled = true
      host.replaceChildren()
    }
  }, [tweetId])

  return createElement(
    'blockquote',
    {
      cite: href,
      className,
      'data-ofm-kind': 'embed',
      'data-ofm-provider': 'twitter',
      'data-ofm-variant': 'external',
      ...(title === undefined ? {} : {title})
    },
    createElement('div', {ref: hostRef}),
    isEnhanced
      ? null
      : createElement(
          'p',
          {className: 'tweet-embed__fallback'},
          createElement('a', {href, rel: 'noreferrer', target: '_blank'}, 'View post on X')
        )
  )
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

function readOfmExternalTweetData(node: Element | undefined): OfmExternalTweetData | undefined {
  const properties = node?.properties

  if (readOptionalString(properties, 'data-ofm-kind') !== 'embed') {
    return undefined
  }

  if (readOptionalString(properties, 'data-ofm-variant') !== 'external') {
    return undefined
  }

  if (readOptionalString(properties, 'data-ofm-provider') !== 'twitter') {
    return undefined
  }

  const href = readOptionalString(properties, 'cite') ?? readFallbackHref(node)

  if (!href) {
    return undefined
  }

  const tweetId = readTweetIdFromHref(href)

  if (!tweetId) {
    return undefined
  }

  return {
    href,
    provider: 'twitter',
    tweetId
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

function readTweetIdFromHref(href: string): string | undefined {
  let url: URL

  try {
    url = new URL(href)
  } catch {
    return undefined
  }

  const host = url.hostname.toLowerCase()

  if (
    host !== 'twitter.com'
    && host !== 'www.twitter.com'
    && host !== 'mobile.twitter.com'
    && host !== 'x.com'
    && host !== 'www.x.com'
  ) {
    return undefined
  }

  const segments = url.pathname.split('/').filter((segment) => segment.length > 0)
  const statusIndex = segments.findIndex((segment) => segment === 'status' || segment === 'statuses')
  const tweetId = statusIndex >= 0 ? segments[statusIndex + 1] : undefined

  return tweetId && /^\d+$/.test(tweetId) ? tweetId : undefined
}

function readOptionalString(properties: Properties | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' ? value : undefined
}

function loadTwitterWidgets(): Promise<TwitterWidgetsApi> {
  const existingWidgets = window.twttr?.widgets

  if (existingWidgets?.createTweet) {
    return Promise.resolve(existingWidgets)
  }

  if (twitterWidgetsPromise) {
    return twitterWidgetsPromise
  }

  const promise = new Promise<TwitterWidgetsApi>((resolve, reject) => {
    const resolveWidgets = () => {
      const widgets = window.twttr?.widgets

      if (widgets?.createTweet) {
        resolve(widgets)
        return
      }

      reject(new Error('Twitter widgets API did not become available.'))
    }

    const handleLoad = () => {
      const api = window.twttr

      if (api?.widgets?.createTweet) {
        resolve(api.widgets)
        return
      }

      if (api?.ready) {
        api.ready(() => resolveWidgets())
        return
      }

      resolveWidgets()
    }

    const handleError = () => {
      reject(new Error('Twitter widgets script failed to load.'))
    }

    const existingScript = document.getElementById('demo-twitter-widgets')

    if (existingScript instanceof HTMLScriptElement) {
      existingScript.addEventListener('load', handleLoad, {once: true})
      existingScript.addEventListener('error', handleError, {once: true})

      if (existingScript.dataset.loaded === 'true') {
        handleLoad()
      }

      return
    }

    const script = document.createElement('script')
    script.id = 'demo-twitter-widgets'
    script.src = 'https://platform.twitter.com/widgets.js'
    script.async = true
    script.charset = 'utf-8'
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      handleLoad()
    }, {once: true})
    script.addEventListener('error', handleError, {once: true})
    document.body.append(script)
  }).catch((error) => {
    twitterWidgetsPromise = undefined
    throw error
  })

  twitterWidgetsPromise = promise
  return promise
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
