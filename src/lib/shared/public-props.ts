import type {Element, Properties} from 'hast'

import {decodeOfmFragment} from './ofm-url.js'

type ValueOf<T> = T[keyof T]

export const ofmPublicPropKeys = {
  alias: 'data-ofm-alias',
  blockId: 'data-ofm-block-id',
  fragment: 'data-ofm-fragment',
  kind: 'data-ofm-kind',
  path: 'data-ofm-path',
  permalink: 'data-ofm-permalink',
  provider: 'data-ofm-provider',
  variant: 'data-ofm-variant'
} as const

export const ofmPublicKind = {
  anchorTarget: 'anchor-target',
  callout: 'callout',
  embed: 'embed',
  highlight: 'highlight',
  wikilink: 'wikilink'
} as const

export const ofmPublicProvider = {
  twitter: 'twitter',
  youtube: 'youtube'
} as const

export const ofmPublicVariant = {
  block: 'block',
  external: 'external',
  file: 'file',
  heading: 'heading',
  image: 'image',
  note: 'note'
} as const

const ofmPublicKinds = Object.values(ofmPublicKind)
const ofmPublicProviders = Object.values(ofmPublicProvider)
const ofmPublicVariants = Object.values(ofmPublicVariant)

export type OfmPublicKind = ValueOf<typeof ofmPublicKind>
export type OfmPublicProvider = ValueOf<typeof ofmPublicProvider>
export type OfmPublicVariant = ValueOf<typeof ofmPublicVariant>

interface OfmTargetPublicFields {
  alias?: string
  blockId?: string
  fragment?: string
  path: string
  permalink: string
}

export interface OfmWikiLinkPublicProps extends OfmTargetPublicFields {
  kind: typeof ofmPublicKind.wikilink
}

export interface OfmNoteLikeEmbedPublicProps extends OfmTargetPublicFields {
  kind: typeof ofmPublicKind.embed
  variant: typeof ofmPublicVariant.file | typeof ofmPublicVariant.image | typeof ofmPublicVariant.note
}

export interface OfmExternalEmbedPublicProps {
  kind: typeof ofmPublicKind.embed
  provider: OfmPublicProvider
  variant: typeof ofmPublicVariant.external
}

export interface OfmAnchorHeadingPublicProps {
  kind: typeof ofmPublicKind.anchorTarget
  variant: typeof ofmPublicVariant.heading
}

export interface OfmAnchorBlockPublicProps {
  blockId: string
  kind: typeof ofmPublicKind.anchorTarget
  variant: typeof ofmPublicVariant.block
}

export interface OfmCalloutPublicProps {
  kind: typeof ofmPublicKind.callout
}

export interface OfmHighlightPublicProps {
  kind: typeof ofmPublicKind.highlight
}

export type OfmPublicProps =
  | OfmAnchorBlockPublicProps
  | OfmAnchorHeadingPublicProps
  | OfmCalloutPublicProps
  | OfmExternalEmbedPublicProps
  | OfmHighlightPublicProps
  | OfmNoteLikeEmbedPublicProps
  | OfmWikiLinkPublicProps

export function setOfmPublicProps(properties: Properties, value: OfmPublicProps): void {
  properties[ofmPublicPropKeys.kind] = value.kind
  delete properties[ofmPublicPropKeys.variant]
  delete properties[ofmPublicPropKeys.path]
  delete properties[ofmPublicPropKeys.permalink]
  delete properties[ofmPublicPropKeys.alias]
  delete properties[ofmPublicPropKeys.blockId]
  delete properties[ofmPublicPropKeys.fragment]
  delete properties[ofmPublicPropKeys.provider]

  switch (value.kind) {
    case ofmPublicKind.wikilink:
      setOptionalString(properties, ofmPublicPropKeys.path, value.path)
      setOptionalString(properties, ofmPublicPropKeys.permalink, value.permalink)
      setOptionalString(properties, ofmPublicPropKeys.alias, value.alias)
      setOptionalString(properties, ofmPublicPropKeys.blockId, value.blockId)
      setOptionalString(properties, ofmPublicPropKeys.fragment, value.fragment)
      return
    case ofmPublicKind.embed:
      setOptionalString(properties, ofmPublicPropKeys.variant, value.variant)

      if (value.variant === ofmPublicVariant.external) {
        setOptionalString(properties, ofmPublicPropKeys.provider, value.provider)
        return
      }

      setOptionalString(properties, ofmPublicPropKeys.path, value.path)
      setOptionalString(properties, ofmPublicPropKeys.permalink, value.permalink)
      setOptionalString(properties, ofmPublicPropKeys.alias, value.alias)
      setOptionalString(properties, ofmPublicPropKeys.blockId, value.blockId)
      setOptionalString(properties, ofmPublicPropKeys.fragment, value.fragment)
      return
    case ofmPublicKind.anchorTarget:
      setOptionalString(properties, ofmPublicPropKeys.variant, value.variant)
      setOptionalString(properties, ofmPublicPropKeys.blockId, 'blockId' in value ? value.blockId : undefined)
      return
    case ofmPublicKind.callout:
    case ofmPublicKind.highlight:
      return
  }
}

export function readOfmPublicProps(node: Element | undefined): OfmPublicProps | undefined {
  const properties = node?.properties
  const kind = readOptionalKind(properties, ofmPublicPropKeys.kind)

  if (kind === undefined) {
    return undefined
  }

  switch (kind) {
    case ofmPublicKind.wikilink: {
      const path = readRequiredString(properties, ofmPublicPropKeys.path)
      const permalink = readRequiredString(properties, ofmPublicPropKeys.permalink)

      if (path === undefined || permalink === undefined) {
        return undefined
      }

      const alias = readOptionalString(properties, ofmPublicPropKeys.alias)
      const blockId = readOptionalString(properties, ofmPublicPropKeys.blockId)
      const fragment = readOptionalString(properties, ofmPublicPropKeys.fragment)

      return {
        kind,
        path,
        permalink,
        ...(alias === undefined ? {} : {alias}),
        ...(blockId === undefined ? {} : {blockId}),
        ...(fragment === undefined ? {} : {fragment})
      }
    }
    case ofmPublicKind.embed: {
      const variant = readOptionalVariant(properties, ofmPublicPropKeys.variant)

      if (variant === undefined) {
        return undefined
      }

      if (variant === ofmPublicVariant.external) {
        const provider = readOptionalProvider(properties, ofmPublicPropKeys.provider)

        return provider === undefined ? undefined : {
          kind,
          variant,
          provider
        }
      }

      if (
        variant !== ofmPublicVariant.file
        && variant !== ofmPublicVariant.image
        && variant !== ofmPublicVariant.note
      ) {
        return undefined
      }

      const path = readRequiredString(properties, ofmPublicPropKeys.path)
      const permalink = readRequiredString(properties, ofmPublicPropKeys.permalink)

      if (path === undefined || permalink === undefined) {
        return undefined
      }

      const alias = readOptionalString(properties, ofmPublicPropKeys.alias)
      const blockId = readOptionalString(properties, ofmPublicPropKeys.blockId)
      const fragment = readOptionalString(properties, ofmPublicPropKeys.fragment)

      return {
        kind,
        variant,
        path,
        permalink,
        ...(alias === undefined ? {} : {alias}),
        ...(blockId === undefined ? {} : {blockId}),
        ...(fragment === undefined ? {} : {fragment})
      }
    }
    case ofmPublicKind.anchorTarget: {
      const variant = readOptionalVariant(properties, ofmPublicPropKeys.variant)

      if (variant === ofmPublicVariant.heading) {
        return {
          kind,
          variant
        }
      }

      if (variant !== ofmPublicVariant.block) {
        return undefined
      }

      const blockId = readRequiredString(properties, ofmPublicPropKeys.blockId)

      if (blockId === undefined) {
        return undefined
      }

      return {
        kind,
        variant,
        blockId
      }
    }
    case ofmPublicKind.callout:
    case ofmPublicKind.highlight:
      return {kind}
  }
}

export function getOfmPublicFragment(permalink: string): string | undefined {
  const hashIndex = permalink.indexOf('#')

  if (hashIndex === -1) {
    return undefined
  }

  const fragment = decodeOfmFragment(permalink.slice(hashIndex))
  return fragment.length > 0 ? fragment : undefined
}

function setOptionalString(properties: Properties, key: string, value: string | undefined): void {
  if (value && value.length > 0) {
    properties[key] = value
    return
  }

  delete properties[key]
}

function readOptionalString(properties: Properties | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readRequiredString(properties: Properties | undefined, key: string): string | undefined {
  return readOptionalString(properties, key)
}

function readOptionalKind(properties: Properties | undefined, key: string): OfmPublicKind | undefined {
  const value = properties?.[key]
  return isOfmPublicKind(value) ? value : undefined
}

function readOptionalProvider(properties: Properties | undefined, key: string): OfmPublicProvider | undefined {
  const value = properties?.[key]
  return isOfmPublicProvider(value) ? value : undefined
}

function readOptionalVariant(properties: Properties | undefined, key: string): OfmPublicVariant | undefined {
  const value = properties?.[key]
  return isOfmPublicVariant(value) ? value : undefined
}

function isOfmPublicKind(value: unknown): value is OfmPublicKind {
  return typeof value === 'string' && (ofmPublicKinds as readonly string[]).includes(value)
}

function isOfmPublicProvider(value: unknown): value is OfmPublicProvider {
  return typeof value === 'string' && (ofmPublicProviders as readonly string[]).includes(value)
}

function isOfmPublicVariant(value: unknown): value is OfmPublicVariant {
  return typeof value === 'string' && (ofmPublicVariants as readonly string[]).includes(value)
}
