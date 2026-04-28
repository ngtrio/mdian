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

export interface OfmPublicProps {
  alias?: string
  blockId?: string
  fragment?: string
  kind: OfmPublicKind
  path?: string
  permalink?: string
  provider?: OfmPublicProvider
  variant?: OfmPublicVariant
}

export function setOfmPublicProps(properties: Properties, value: OfmPublicProps): void {
  properties[ofmPublicPropKeys.kind] = value.kind
  setOptionalString(properties, ofmPublicPropKeys.variant, value.variant)
  setOptionalString(properties, ofmPublicPropKeys.path, value.path)
  setOptionalString(properties, ofmPublicPropKeys.permalink, value.permalink)
  setOptionalString(properties, ofmPublicPropKeys.alias, value.alias)
  setOptionalString(properties, ofmPublicPropKeys.blockId, value.blockId)
  setOptionalString(properties, ofmPublicPropKeys.fragment, value.fragment)
  setOptionalString(properties, ofmPublicPropKeys.provider, value.provider)
}

export function readOfmPublicProps(node: Element | undefined): OfmPublicProps | undefined {
  const properties = node?.properties
  const kind = readOptionalKind(properties, ofmPublicPropKeys.kind)

  if (kind === undefined) {
    return undefined
  }

  const variant = readOptionalVariant(properties, ofmPublicPropKeys.variant)
  const path = readOptionalString(properties, ofmPublicPropKeys.path)
  const permalink = readOptionalString(properties, ofmPublicPropKeys.permalink)
  const alias = readOptionalString(properties, ofmPublicPropKeys.alias)
  const blockId = readOptionalString(properties, ofmPublicPropKeys.blockId)
  const fragment = readOptionalString(properties, ofmPublicPropKeys.fragment)
  const provider = readOptionalProvider(properties, ofmPublicPropKeys.provider)

  return {
    kind,
    ...(variant === undefined ? {} : {variant}),
    ...(path === undefined ? {} : {path}),
    ...(permalink === undefined ? {} : {permalink}),
    ...(alias === undefined ? {} : {alias}),
    ...(blockId === undefined ? {} : {blockId}),
    ...(fragment === undefined ? {} : {fragment}),
    ...(provider === undefined ? {} : {provider})
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
