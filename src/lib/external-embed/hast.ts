import type { Element, Root, RootContent, Text } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import { addClassName, ofmClassNames } from '../shared/class-name.js'
import {
  ofmPublicKind,
  ofmPublicProvider,
  ofmPublicVariant,
  readOfmPublicProps,
  setOfmPublicProps,
  type OfmPublicProvider
} from '../shared/public-props.js'
import {splitParagraphChildren} from '../shared/paragraph-split.js'

const twitterClassName = 'twitter-tweet'
const youtubeAllowValue = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'

interface ExternalEmbedMatchBase {
  provider: OfmPublicProvider
  src: string
}

interface YoutubeEmbedMatch extends ExternalEmbedMatchBase {
  embedSrc: string
  provider: typeof ofmPublicProvider.youtube
}

interface TwitterEmbedMatch extends ExternalEmbedMatchBase {
  href: string
  provider: typeof ofmPublicProvider.twitter
  tweetId: string
}

type ExternalEmbedMatch = TwitterEmbedMatch | YoutubeEmbedMatch

export function externalEmbedHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const externalEmbedsEnabled = options.externalEmbeds !== false
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if ('children' in node && Array.isArray(node.children)) {
      splitParagraphChildren(node, isExternalEmbedBlock)
    }

    if (node.type !== 'element') {
      return
    }

    if (!externalEmbedsEnabled || node.tagName !== 'img') {
      return
    }

    const src = readString(node.properties.src)

    if (!src) {
      return
    }

    const match = resolveExternalEmbed(src)

    if (!match) {
      return
    }

    const title = getExternalEmbedTitle(node, match.provider)

    if (match.provider === ofmPublicProvider.youtube) {
      node.tagName = 'iframe'
      delete node.properties.alt
      node.properties.src = match.embedSrc
      node.properties.allow = youtubeAllowValue
      node.properties.allowFullScreen = true
      node.properties.frameBorder = 0
      node.properties.height = 315
      node.properties.loading = 'lazy'
      node.properties.referrerPolicy = 'strict-origin-when-cross-origin'
      node.properties.width = 560
      node.children = []
      addClassName(node.properties, ofmClassNames.externalEmbed)
      setOfmPublicProps(node.properties, {
        kind: ofmPublicKind.embed,
        variant: ofmPublicVariant.external,
        provider: match.provider
      })
      applyTitle(node.properties, title, setTitle)
      return
    }

    node.tagName = 'div'
    delete node.properties.alt
    delete node.properties.loading
    delete node.properties.src
    delete node.properties.cite
    node.children = [createTwitterFallback(match.href)]
    addClassName(node.properties, ofmClassNames.externalEmbed, twitterClassName)
    setOfmPublicProps(node.properties, {
      kind: ofmPublicKind.embed,
      variant: ofmPublicVariant.external,
      provider: match.provider
    })
    applyTitle(node.properties, title, setTitle)
  }
}

function isExternalEmbedBlock(node: Element['children'][number]): boolean {
  if (node.type !== 'element') {
    return false
  }

  const props = readOfmPublicProps(node)

  if (props?.kind !== ofmPublicKind.embed || props.variant !== ofmPublicVariant.external) {
    return false
  }

  return (
    (node.tagName === 'div' && props.provider === ofmPublicProvider.twitter)
    || (node.tagName === 'iframe' && props.provider === ofmPublicProvider.youtube)
  )
}

function resolveExternalEmbed(value: string): ExternalEmbedMatch | undefined {
  const url = toUrl(value)

  if (!url) {
    return undefined
  }

  return resolveYoutubeEmbed(url) ?? resolveTwitterEmbed(url)
}

function resolveYoutubeEmbed(url: URL): YoutubeEmbedMatch | undefined {
  const host = url.hostname.toLowerCase()

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    const videoId = firstPathSegment(url)

    if (!videoId) {
      return undefined
    }

    return {
      provider: ofmPublicProvider.youtube,
      src: url.toString(),
      embedSrc: buildYoutubeEmbedUrl(videoId)
    }
  }

  if (host !== 'youtube.com' && host !== 'www.youtube.com' && host !== 'm.youtube.com') {
    return undefined
  }

  const segments = pathSegments(url)
  const videoId =
    (segments[0] === 'watch' ? url.searchParams.get('v') : undefined)
    ?? (segments[0] === 'embed' ? segments[1] : undefined)
    ?? (segments[0] === 'shorts' ? segments[1] : undefined)

  if (!videoId) {
    return undefined
  }

  return {
    provider: ofmPublicProvider.youtube,
    src: url.toString(),
    embedSrc: buildYoutubeEmbedUrl(videoId)
  }
}

function resolveTwitterEmbed(url: URL): TwitterEmbedMatch | undefined {
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

  const segments = pathSegments(url)
  const statusIndex = segments.findIndex((segment) => segment === 'status' || segment === 'statuses')
  const tweetId = statusIndex >= 0 ? segments[statusIndex + 1] : undefined

  if (!tweetId || !/^\d+$/.test(tweetId)) {
    return undefined
  }

  return {
    provider: ofmPublicProvider.twitter,
    src: url.toString(),
    href: buildTwitterStatusUrl(segments[0] ?? 'i', tweetId),
    tweetId
  }
}

function createTwitterFallback(href: string): Element {
  return {
    type: 'element',
    tagName: 'p',
    properties: {className: ['tweet-embed__fallback']},
    children: [
      {
        type: 'element',
        tagName: 'a',
        properties: {
          href,
          rel: ['noreferrer'],
          target: '_blank'
        },
        children: [{type: 'text', value: 'View post on X'} satisfies Text]
      }
    ]
  }
}

function applyTitle(properties: Record<string, unknown>, title: string, setTitle: boolean): void {
  if (setTitle) {
    properties.title = title
    return
  }

  delete properties.title
}

function buildYoutubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
}

function buildTwitterStatusUrl(screenName: string, tweetId: string): string {
  return `https://twitter.com/${encodeURIComponent(screenName)}/status/${encodeURIComponent(tweetId)}`
}

function firstPathSegment(url: URL): string | undefined {
  return pathSegments(url)[0]
}

function pathSegments(url: URL): string[] {
  return url.pathname.split('/').filter((segment) => segment.length > 0)
}

function getExternalEmbedTitle(node: Element, provider: OfmPublicProvider): string {
  const alt = readString(node.properties.alt)

  if (alt) {
    return alt
  }

  return provider === ofmPublicProvider.youtube ? 'Embedded YouTube video' : 'Embedded post from X'
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function toUrl(value: string): URL | undefined {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}
