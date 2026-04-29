import type {Element} from 'hast'
import {createElement, useEffect, useRef, useState} from 'react'

import {loadTwitterWidgets} from './twitter.js'
import type {OfmReactTwitterOptions} from './types.js'

export interface TwitterEmbedRenderData {
  href: string
  tweetId: string
  title?: string
}

type TwitterEmbedStatus = 'loading' | 'enhanced' | 'failed'

export function readTwitterEmbedRenderData(node: Element | undefined): TwitterEmbedRenderData | undefined {
  if (!node || node.tagName !== 'div') {
    return undefined
  }

  if (node.properties['data-ofm-kind'] !== 'embed') {
    return undefined
  }

  if (node.properties['data-ofm-variant'] !== 'external') {
    return undefined
  }

  const provider = node.properties['data-ofm-provider']
  if (provider !== 'twitter') {
    return undefined
  }

  const href = readTwitterFallbackHref(node.children[0])
  if (!href) {
    return undefined
  }

  const match = /status\/(\d+)/.exec(href)
  const tweetId = match?.[1]
  if (!tweetId) {
    return undefined
  }

  const title = typeof node.properties.title === 'string' ? node.properties.title : undefined

  return {
    href,
    tweetId,
    ...(title === undefined ? {} : {title})
  }
}

function readTwitterFallbackHref(node: Element['children'][number] | undefined): string | undefined {
  if (!node) {
    return undefined
  }

  if (node.type === 'text' && typeof node.value === 'string') {
    return node.value
  }

  if (node.type !== 'element' || node.tagName !== 'p') {
    return undefined
  }

  const link = node.children[0]
  return link?.type === 'element' && link.tagName === 'a' && typeof link.properties.href === 'string'
    ? link.properties.href
    : undefined
}

export function TwitterEmbedCard({
  className,
  data,
  options
}: {
  className?: string
  data: TwitterEmbedRenderData
  options?: OfmReactTwitterOptions
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<TwitterEmbedStatus>('loading')

  useEffect(() => {
    const host = hostRef.current

    if (!options?.enhance || !host) {
      return
    }

    let cancelled = false
    setStatus('loading')
    host.replaceChildren(createTwitterEmbedLoadingNode())

    void loadTwitterWidgets({
      ...(options.loadScript === undefined ? {} : {loadScript: options.loadScript})
    })
      .then((widgets) => {
        if (cancelled) {
          return undefined
        }

        host.replaceChildren()
        return widgets.createTweet?.(data.tweetId, host, {align: 'center', dnt: true})
      })
      .then((tweet) => {
        if (cancelled) {
          return
        }

        if (tweet) {
          setStatus('enhanced')
          return
        }

        host.replaceChildren(createTwitterFallbackNode(data.href))
        setStatus('failed')
      })
      .catch(() => {
        if (!cancelled) {
          host.replaceChildren(createTwitterFallbackNode(data.href))
          setStatus('failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [data.href, data.tweetId, options?.enhance, options?.loadScript])

  if (!options?.enhance) {
    return createElement('div', buildTwitterEmbedProps({
      data,
      ...(className === undefined ? {} : {className})
    }), createTwitterFallbackLink(data.href))
  }

  const serverFallback = isServerRender() ? createTwitterFallbackLink(data.href) : undefined

  return createElement(
    'div',
    {
      ...buildTwitterEmbedProps({
        data,
        ...(className === undefined ? {} : {className})
      }),
      ref: hostRef,
      ...(status === 'enhanced' ? {'data-twitter-enhanced': 'true'} : {}),
      ...(status === 'enhanced' ? {} : {'aria-busy': 'true'})
    },
    status === 'failed' ? createTwitterFallbackLink(data.href) : serverFallback
  )
}

function buildTwitterEmbedProps({
  className,
  data
}: {
  className?: string
  data: TwitterEmbedRenderData
}) {
  return {
    ...(className === undefined ? {} : {className}),
    'data-ofm-kind': 'embed',
    'data-ofm-provider': 'twitter',
    'data-ofm-variant': 'external',
    ...(data.title === undefined ? {} : {title: data.title})
  }
}

function createTwitterFallbackLink(href: string) {
  return createElement(
    'p',
    {className: 'tweet-embed__fallback'},
    createElement('a', {href, rel: 'noreferrer', target: '_blank'}, 'View post on X')
  )
}

function createTwitterFallbackNode(href: string): HTMLParagraphElement {
  const paragraph = document.createElement('p')
  paragraph.className = 'tweet-embed__fallback'

  const link = document.createElement('a')
  link.href = href
  link.rel = 'noreferrer'
  link.target = '_blank'
  link.textContent = 'View post on X'

  paragraph.appendChild(link)
  return paragraph
}

function isServerRender(): boolean {
  return typeof document === 'undefined'
}

function createTwitterEmbedLoadingNode(): HTMLParagraphElement {
  const node = document.createElement('p')
  node.className = 'tweet-embed__loading'
  node.textContent = 'Loading post…'
  return node
}
