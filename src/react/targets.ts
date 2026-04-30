import type {Element, ElementContent, Text} from 'hast'

import {
  ofmPublicKind,
  ofmPublicVariant,
  readOfmPublicProps
} from '../lib/shared/public-props.js'
import {formatOfmTargetLabel} from '../lib/shared/ofm-url.js'
import type {OfmReactTarget} from './types.js'

export interface WikiLinkRenderData {
  fallbackHref?: string
  fallbackTitle?: string
  target: OfmReactTarget
}

export interface NoteEmbedRenderData {
  fallbackHref?: string
  fallbackLabel: string
  target: OfmReactTarget
  title?: string
}

export interface ImageEmbedRenderData {
  path: string
}

export function readWikiLinkRenderData(
  node: Element | undefined,
  href: string | undefined,
  title: string | undefined
): WikiLinkRenderData | undefined {
  const props = readOfmPublicProps(node)

  if (!props || props.kind !== ofmPublicKind.wikilink) {
    return undefined
  }

  return {
    target: {
      path: props.path,
      ...(props.fragment === undefined ? {} : {fragment: props.fragment})
    },
    ...(href === undefined ? {} : {fallbackHref: href}),
    ...(title === undefined ? {} : {fallbackTitle: title})
  }
}

export function readNoteEmbedRenderData(node: Element | undefined): NoteEmbedRenderData | undefined {
  const props = readOfmPublicProps(node)

  if (!props || props.kind !== ofmPublicKind.embed || props.variant !== ofmPublicVariant.note) {
    return undefined
  }

  const fallbackAnchor = node?.children.find(isAnchorElement)
  const fallbackHref = typeof fallbackAnchor?.properties.href === 'string'
    ? fallbackAnchor.properties.href
    : undefined
  const fallbackText = readFirstTextChild(fallbackAnchor)
  const fallbackLabel = fallbackText ?? props.alias ?? formatOfmTargetLabel(props)
  const title = typeof node?.properties.title === 'string' ? node.properties.title : undefined

  return {
    fallbackLabel,
    target: {
      path: props.path,
      ...(props.fragment === undefined ? {} : {fragment: props.fragment})
    },
    ...(fallbackHref === undefined ? {} : {fallbackHref}),
    ...(title === undefined ? {} : {title})
  }
}

export function readImageEmbedRenderData(node: Element | undefined): ImageEmbedRenderData | undefined {
  const props = readOfmPublicProps(node)

  if (!props || props.kind !== ofmPublicKind.embed || props.variant !== ofmPublicVariant.image) {
    return undefined
  }

  return {path: props.path}
}

function isAnchorElement(node: ElementContent): node is Element {
  return node.type === 'element' && node.tagName === 'a'
}

function readFirstTextChild(node: Element | undefined): string | undefined {
  const firstChild = node?.children[0]
  return isTextNode(firstChild) ? firstChild.value : undefined
}

function isTextNode(node: ElementContent | undefined): node is Text {
  return node?.type === 'text'
}
