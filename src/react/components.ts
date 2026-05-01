import type {Element} from 'hast'
import {createElement} from 'react'
import type {Components} from 'react-markdown'
import ReactMarkdown from 'react-markdown'

import {buildOfmTargetHref} from '../lib/shared/ofm-url.js'
import {TwitterEmbedCard, readTwitterEmbedRenderData} from './external-embed.js'
import {renderOfmNoteEmbed} from './note-embed.js'
import {createOfmReactPreset} from './preset.js'
import {
  type RenderTargetData,
  readImageEmbedRenderData,
  readNoteEmbedRenderData,
  readWikiLinkRenderData
} from './targets.js'
import type {OfmReactPresetOptions} from './types.js'

function readNode(node: unknown): Element | undefined {
  return typeof node === 'object' && node !== null && 'type' in node ? node as Element : undefined
}

type NoteEmbedRenderData = NonNullable<ReturnType<typeof readNoteEmbedRenderData>>

function resolveTargetHref(
  data: RenderTargetData,
  options: OfmReactPresetOptions
): string | undefined {
  const hrefPrefix = options.ofm?.rehype?.hrefPrefix

  if (hrefPrefix !== undefined) {
    return buildOfmTargetHref(data.target, hrefPrefix)
  }

  return data.fallbackHref
}

function renderResolvedNoteEmbed(
  data: NoteEmbedRenderData,
  options: OfmReactPresetOptions,
  className: string | undefined
) {
  const fallbackHref = resolveTargetHref(data, options)
  const resolved = options.noteEmbed?.resolve?.({path: data.target.path})

  if (!resolved) {
    return createElement('a', {...(fallbackHref === undefined ? {} : {href: fallbackHref})}, data.fallbackLabel)
  }

  return renderOfmNoteEmbed({
    fallbackLabel: data.fallbackLabel,
    renderBody(markdown) {
      const preset = createOfmReactPreset(options)
      return createElement(
        ReactMarkdown,
        {
          components: preset.components,
          rehypePlugins: preset.rehypePlugins,
          remarkPlugins: preset.remarkPlugins
        },
        markdown
      )
    },
    resolved,
    target: data.target,
    ...(className === undefined ? {} : {className}),
    ...(fallbackHref === undefined ? {} : {fallbackHref}),
    ...(options.noteEmbed?.maxDepth === undefined ? {} : {maxDepth: options.noteEmbed.maxDepth})
  })
}

export function createOfmReactComponents(options: OfmReactPresetOptions = {}): Components {
  return {
    a({children, className, href, node, title, ...props}) {
      const data = readWikiLinkRenderData(readNode(node), href, typeof title === 'string' ? title : undefined)
      const resolvedHref = data ? resolveTargetHref(data, options) : href

      if (!data) {
        return createElement('a', {...props, className, href: resolvedHref, title}, children)
      }

      const renderWikiLink = options.wikiLink?.render
      const resolvedTitle = data.fallbackTitle ?? title

      if (renderWikiLink) {
        return renderWikiLink({
          href: resolvedHref ?? '',
          ...(children === undefined ? {} : {children}),
          ...(className === undefined ? {} : {className}),
          ...(resolvedTitle === undefined ? {} : {title: resolvedTitle})
        })
      }

      return createElement('a', {
        ...props,
        className,
        href: resolvedHref,
        ...(resolvedTitle === undefined ? {} : {title: resolvedTitle})
      }, children)
    },
    p({children, className, node, ...props}) {
      return createElement('p', {...props, className}, children)
    },
    div({children, className, node, ...props}) {
      const element = readNode(node)
      const noteEmbed = readNoteEmbedRenderData(element)

      if (noteEmbed) {
        return renderResolvedNoteEmbed(noteEmbed, options, className)
      }

      const twitterEmbed = readTwitterEmbedRenderData(element)

      if (twitterEmbed) {
        return createElement(TwitterEmbedCard, {
          data: twitterEmbed,
          ...(className === undefined ? {} : {className}),
          ...(options.externalEmbeds?.twitter === undefined ? {} : {options: options.externalEmbeds.twitter})
        })
      }

      return createElement('div', {...props, className}, children)
    },
    img({node, src, ...props}) {
      if (typeof src !== 'string') {
        return createElement('img', props)
      }

      const imageEmbed = readImageEmbedRenderData(readNode(node))
      const resolvedSrc = options.image?.transformSrc
        ? options.image.transformSrc(src, imageEmbed?.path)
        : src
      return createElement('img', {...props, src: resolvedSrc})
    }
  }
}
