import type {Element} from 'hast'
import {createElement, type ReactNode} from 'react'
import type {Components} from 'react-markdown'

import {ofmPublicKind, ofmPublicVariant} from '../lib/shared/public-props.js'
import {readOfmPublicData} from './public-props.js'

interface OfmRendererProps {
  children?: ReactNode
  className?: string
  href?: string
  path: string
  permalink: string
}

interface OfmTargetRendererProps extends OfmRendererProps {
  blockId?: string
  fragment?: string
}

export interface OfmWikiLinkRendererProps extends OfmTargetRendererProps {
  alias?: string
}

export interface OfmNoteEmbedRendererProps extends OfmTargetRendererProps {
  title?: string
}

export interface CreateOfmComponentsOptions {
  renderNoteEmbed?: (props: OfmNoteEmbedRendererProps) => ReactNode
  renderWikiLink?: (props: OfmWikiLinkRendererProps) => ReactNode
}

export function createOfmComponents(options: CreateOfmComponentsOptions = {}): Components {
  const {renderNoteEmbed, renderWikiLink} = options

  return {
    a({children, className, href, node, ...props}) {
      const data = readOfmPublicData(node as Element | undefined)

      if (data?.kind !== ofmPublicKind.wikilink || !renderWikiLink) {
        return createElement('a', {...props, className, href}, children)
      }

      return renderWikiLink({
        children,
        path: data.path,
        permalink: data.permalink,
        ...(data.alias === undefined ? {} : {alias: data.alias}),
        ...(data.blockId === undefined ? {} : {blockId: data.blockId}),
        ...(className === undefined ? {} : {className}),
        ...(data.fragment === undefined ? {} : {fragment: data.fragment}),
        ...(href === undefined ? {} : {href})
      })
    },
    div({children, className, node, ...props}) {
      const element = node as Element | undefined
      const data = readOfmPublicData(element)

      if (data?.kind === ofmPublicKind.embed && data.variant === ofmPublicVariant.note && !renderNoteEmbed) {
        return createElement('span', {...props, className}, children)
      }

      if (data?.kind !== ofmPublicKind.embed || data.variant !== ofmPublicVariant.note) {
        return createElement('div', {...props, className}, children)
      }

      const href = readFallbackHref(element)
      const title = readTitle(element)

      return renderNoteEmbed!({
        children,
        path: data.path,
        permalink: data.permalink,
        ...(data.blockId === undefined ? {} : {blockId: data.blockId}),
        ...(className === undefined ? {} : {className}),
        ...(data.fragment === undefined ? {} : {fragment: data.fragment}),
        ...(href === undefined ? {} : {href}),
        ...(title === undefined ? {} : {title})
      })
    }
  }
}

function readFallbackHref(node: Element | undefined): string | undefined {
  const firstChild = node?.children[0]

  if (!firstChild || firstChild.type !== 'element' || firstChild.tagName !== 'a') {
    return undefined
  }

  const href = firstChild.properties?.href
  return typeof href === 'string' ? href : undefined
}

function readTitle(node: Element | undefined): string | undefined {
  const title = node?.properties?.title
  return typeof title === 'string' ? title : undefined
}
