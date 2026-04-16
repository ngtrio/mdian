import type {Properties} from 'hast'

import type {EmbedData} from './embed/types.js'
import type {WikiLinkData} from './wikilink/types.js'

export type OfmNodeKind = 'embed' | 'highlight' | 'wikilink'

export type OfmReferenceData = EmbedData | WikiLinkData

export type OfmNodeData = OfmReferenceData | {kind: 'highlight'}

const ofmDataPropKeys = [
  'dataOfmAlias',
  'dataOfmBlockId',
  'dataOfmKind',
  'dataOfmPath',
  'dataOfmPermalink',
  'dataOfmValue',
  'data-ofm-alias',
  'data-ofm-block-id',
  'data-ofm-kind',
  'data-ofm-path',
  'data-ofm-permalink',
  'data-ofm-value'
] as const

export function getOfmNodeKind(properties?: Properties | undefined): OfmNodeKind | undefined {
  const kind = properties?.dataOfmKind
  return kind === 'embed' || kind === 'highlight' || kind === 'wikilink' ? kind : undefined
}

export function getOfmNodeData(properties?: Properties | undefined): OfmNodeData | undefined {
  const kind = getOfmNodeKind(properties)

  if (!kind) {
    return undefined
  }

  if (kind === 'highlight') {
    return {kind}
  }

  return {
    kind,
    value: readString(properties, 'dataOfmValue'),
    path: readString(properties, 'dataOfmPath'),
    permalink: readString(properties, 'dataOfmPermalink'),
    ...(readOptionalString(properties, 'dataOfmAlias') === undefined
      ? {}
      : {alias: readOptionalString(properties, 'dataOfmAlias')}),
    ...(readOptionalString(properties, 'dataOfmBlockId') === undefined
      ? {}
      : {blockId: readOptionalString(properties, 'dataOfmBlockId')})
  }
}

export function stripOfmDataProps(props: Record<string, unknown>): Record<string, unknown> {
  const rest = {...props}
  clearOfmDataProps(rest)
  delete rest['data-anchor-key']
  return rest
}

export function clearOfmDataProps(properties?: Properties | Record<string, unknown>): void {
  if (!properties) {
    return
  }

  for (const key of ofmDataPropKeys) {
    delete properties[key]
  }
}

function readString(properties: Properties | undefined, key: string): string {
  const value = properties?.[key]
  return typeof value === 'string' ? value : ''
}

function readOptionalString(properties: Properties | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
