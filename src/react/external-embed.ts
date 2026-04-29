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

  const firstChild = node.children[0]
  const href = firstChild && firstChild.type === 'text' && typeof firstChild.value === 'string'
    ? firstChild.value
    : undefined
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

        host.replaceChildren()
        setStatus('failed')
      })
      .catch(() => {
        if (!cancelled) {
          host.replaceChildren()
          setStatus('failed')
        }
      })

    return () => {
      cancelled = true
    }
  }, [data.href, data.tweetId, options?.enhance, options?.loadScript])

  if (!options?.enhance) {
    return createElement(
      'div',
      {
        className,
        'data-ofm-kind': 'embed',
        'data-ofm-provider': 'twitter',
        'data-ofm-variant': 'external',
        ...(data.title === undefined ? {} : {title: data.title})
      },
      createElement(
        'p',
        {className: 'tweet-embed__fallback'},
        createElement('a', {href: data.href, rel: 'noreferrer', target: '_blank'}, 'View post on X')
      )
    )
  }

  return createElement(
    'div',
    {
      ref: hostRef,
      className,
      'data-ofm-kind': 'embed',
      'data-ofm-provider': 'twitter',
      'data-ofm-variant': 'external',
      ...(data.title === undefined ? {} : {title: data.title}),
      ...(status === 'enhanced' ? {'data-twitter-enhanced': 'true'} : {}),
      ...(status === 'enhanced' ? {} : {'aria-busy': 'true'})
    },
    status === 'failed'
      ? createElement(
          'p',
          {className: 'tweet-embed__fallback'},
          createElement('a', {href: data.href, rel: 'noreferrer', target: '_blank'}, 'View post on X')
        )
      : undefined
  )
}

function createTwitterEmbedLoadingNode(): HTMLParagraphElement {
  const node = document.createElement('p')
  node.className = 'tweet-embed__loading'
  node.textContent = 'Loading post…'
  return node
}
