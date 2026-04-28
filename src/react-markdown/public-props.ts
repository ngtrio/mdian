import type {Element} from 'hast'

import {
  ofmPublicKind,
  ofmPublicVariant,
  readOfmPublicProps,
  type OfmPublicProps,
  type OfmPublicVariant
} from '../lib/shared/public-props.js'

type OfmReactPublicBase = Required<Pick<OfmPublicProps, 'path' | 'permalink'>>
  & Pick<OfmPublicProps, 'alias' | 'blockId' | 'fragment'>

type OfmReactEmbedVariant = Extract<OfmPublicVariant, 'file' | 'image' | 'note'>

export type OfmReactPublicData =
  | (OfmReactPublicBase & {
      kind: 'embed'
      variant?: OfmReactEmbedVariant
    })
  | (OfmReactPublicBase & {
      kind: 'wikilink'
    })

export function readOfmPublicData(node: Element | undefined): OfmReactPublicData | undefined {
  const data = readOfmPublicProps(node)

  if (data?.kind === ofmPublicKind.wikilink) {
    return {
      kind: data.kind,
      path: data.path ?? '',
      permalink: data.permalink ?? '',
      ...(data.alias === undefined ? {} : {alias: data.alias}),
      ...(data.blockId === undefined ? {} : {blockId: data.blockId}),
      ...(data.fragment === undefined ? {} : {fragment: data.fragment})
    }
  }

  if (data?.kind === ofmPublicKind.embed) {
    const variant = toReactEmbedVariant(data.variant)

    return {
      kind: data.kind,
      path: data.path ?? '',
      permalink: data.permalink ?? '',
      ...(variant === undefined ? {} : {variant}),
      ...(data.alias === undefined ? {} : {alias: data.alias}),
      ...(data.blockId === undefined ? {} : {blockId: data.blockId}),
      ...(data.fragment === undefined ? {} : {fragment: data.fragment})
    }
  }

  return undefined
}

function toReactEmbedVariant(value: string | undefined): OfmReactEmbedVariant | undefined {
  return value === ofmPublicVariant.file || value === ofmPublicVariant.image || value === ofmPublicVariant.note
    ? value
    : undefined
}
