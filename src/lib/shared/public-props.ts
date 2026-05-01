import type {Element, Properties} from 'hast'

type ValueOf<T> = T[keyof T]

export const ofmPublicPropKeys = {
  alias: 'data-ofm-alias',
  fragment: 'data-ofm-fragment',
  kind: 'data-ofm-kind',
  path: 'data-ofm-path',
  provider: 'data-ofm-provider',
  variant: 'data-ofm-variant'
} as const

export const ofmPublicKind = {
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
  external: 'external',
  file: 'file',
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
  fragment?: string
  path: string
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

export interface OfmCalloutPublicProps {
  kind: typeof ofmPublicKind.callout
}

export interface OfmHighlightPublicProps {
  kind: typeof ofmPublicKind.highlight
}

export type OfmPublicProps =
  | OfmCalloutPublicProps
  | OfmExternalEmbedPublicProps
  | OfmHighlightPublicProps
  | OfmNoteLikeEmbedPublicProps
  | OfmWikiLinkPublicProps

export function setOfmPublicProps(properties: Properties, value: OfmPublicProps): void {
  properties[ofmPublicPropKeys.kind] = value.kind
  delete properties[ofmPublicPropKeys.variant]
  delete properties[ofmPublicPropKeys.path]
  delete properties[ofmPublicPropKeys.alias]
  delete properties[ofmPublicPropKeys.fragment]
  delete properties[ofmPublicPropKeys.provider]

  switch (value.kind) {
    case ofmPublicKind.wikilink:
      setOptionalString(properties, ofmPublicPropKeys.path, value.path)
      setOptionalString(properties, ofmPublicPropKeys.alias, value.alias)
      setOptionalString(properties, ofmPublicPropKeys.fragment, value.fragment)
      return
    case ofmPublicKind.embed:
      setOptionalString(properties, ofmPublicPropKeys.variant, value.variant)

      if (value.variant === ofmPublicVariant.external) {
        setOptionalString(properties, ofmPublicPropKeys.provider, value.provider)
        return
      }

      setOptionalString(properties, ofmPublicPropKeys.path, value.path)
      setOptionalString(properties, ofmPublicPropKeys.alias, value.alias)
      setOptionalString(properties, ofmPublicPropKeys.fragment, value.fragment)
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

      if (path === undefined) {
        return undefined
      }

      const alias = readOptionalString(properties, ofmPublicPropKeys.alias)
      const fragment = readOptionalString(properties, ofmPublicPropKeys.fragment)

      return {
        kind,
        path,
        ...(alias === undefined ? {} : {alias}),
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

      if (path === undefined) {
        return undefined
      }

      const alias = readOptionalString(properties, ofmPublicPropKeys.alias)
      const fragment = readOptionalString(properties, ofmPublicPropKeys.fragment)

      return {
        kind,
        variant,
        path,
        ...(alias === undefined ? {} : {alias}),
        ...(fragment === undefined ? {} : {fragment})
      }
    }
    case ofmPublicKind.callout:
    case ofmPublicKind.highlight:
      return {kind}
  }
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
