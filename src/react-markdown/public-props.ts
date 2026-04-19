import type {Element} from 'hast'

export type OfmReactPublicData =
  | {
      alias?: string
      blockId?: string
      fragment?: string
      kind: 'embed'
      path: string
      permalink: string
      variant?: 'file' | 'image' | 'note'
    }
  | {
      alias?: string
      blockId?: string
      fragment?: string
      kind: 'wikilink'
      path: string
      permalink: string
    }

export function readOfmPublicData(node: Element | undefined): OfmReactPublicData | undefined {
  const properties = node?.properties
  const kind = readString(properties, 'data-ofm-kind')

  if (kind === 'wikilink') {
    const alias = readOptionalString(properties, 'data-ofm-alias')
    const blockId = readOptionalString(properties, 'data-ofm-block-id')
    const fragment = readOptionalString(properties, 'data-ofm-fragment')

    return {
      kind,
      path: readString(properties, 'data-ofm-path'),
      permalink: readString(properties, 'data-ofm-permalink'),
      ...(alias === undefined ? {} : {alias}),
      ...(blockId === undefined ? {} : {blockId}),
      ...(fragment === undefined ? {} : {fragment})
    }
  }

  if (kind === 'embed') {
    const variant = readOptionalVariant(properties, 'data-ofm-variant')
    const alias = readOptionalString(properties, 'data-ofm-alias')
    const blockId = readOptionalString(properties, 'data-ofm-block-id')
    const fragment = readOptionalString(properties, 'data-ofm-fragment')

    return {
      kind,
      path: readString(properties, 'data-ofm-path'),
      permalink: readString(properties, 'data-ofm-permalink'),
      ...(variant === undefined ? {} : {variant}),
      ...(alias === undefined ? {} : {alias}),
      ...(blockId === undefined ? {} : {blockId}),
      ...(fragment === undefined ? {} : {fragment})
    }
  }

  return undefined
}

function readString(properties: Record<string, unknown> | undefined, key: string): string {
  const value = properties?.[key]
  return typeof value === 'string' ? value : ''
}

function readOptionalString(properties: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readOptionalVariant(
  properties: Record<string, unknown> | undefined,
  key: string
): 'file' | 'image' | 'note' | undefined {
  const value = properties?.[key]
  return value === 'file' || value === 'image' || value === 'note' ? value : undefined
}
