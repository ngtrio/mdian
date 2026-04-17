import type {Properties} from 'hast'

import type {CalloutData} from './callout/types.js'
import type {EmbedData} from './embed/types.js'
import type {WikiLinkData} from './wikilink/types.js'

export type OfmNodeKind = 'callout' | 'comment' | 'embed' | 'highlight' | 'wikilink'
export type OfmInlineMetadata = {kind: 'comment', value: string} | {kind: 'highlight'}

export type OfmReferenceData = EmbedData | WikiLinkData

export type OfmNodeData = CalloutData | OfmReferenceData | OfmInlineMetadata

const ofmDataPropKeys = [
  'dataOfmAlias',
  'dataOfmBlockId',
  'dataOfmCalloutType',
  'dataOfmCollapsed',
  'dataOfmFoldable',
  'dataOfmHeight',
  'dataOfmKind',
  'dataOfmPath',
  'dataOfmPermalink',
  'dataOfmTitle',
  'dataOfmValue',
  'dataOfmWidth',
  'data-ofm-alias',
  'data-ofm-block-id',
  'data-ofm-callout-type',
  'data-ofm-height',
  'data-ofm-kind',
  'data-ofm-path',
  'data-ofm-permalink',
  'data-ofm-title',
  'data-ofm-value',
  'data-ofm-width'
] as const

export function getOfmNodeKind(properties?: Properties | undefined): OfmNodeKind | undefined {
  const kind = properties?.dataOfmKind
  return kind === 'callout' || kind === 'comment' || kind === 'embed' || kind === 'highlight' || kind === 'wikilink' ? kind : undefined
}

export function getOfmNodeData(properties?: Properties | undefined): OfmNodeData | undefined {
  const kind = getOfmNodeKind(properties)

  if (!kind) {
    return undefined
  }

  if (kind === 'comment') {
    return {
      kind,
      value: readString(properties, 'dataOfmValue')
    }
  }

  if (kind === 'highlight') {
    return { kind }
  }

  if (kind === 'callout') {
    return {
      kind,
      calloutType: readString(properties, 'dataOfmCalloutType'),
      title: readString(properties, 'dataOfmTitle'),
      foldable: readBoolean(properties, 'dataOfmFoldable'),
      collapsed: readBoolean(properties, 'dataOfmCollapsed')
    }
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
      : {blockId: readOptionalString(properties, 'dataOfmBlockId')}),
    ...(readOptionalNumber(properties, 'dataOfmWidth') === undefined && readOptionalNumber(properties, 'dataOfmHeight') === undefined
      ? {}
      : {
          size: {
            ...(readOptionalNumber(properties, 'dataOfmWidth') === undefined
              ? {}
              : {width: readOptionalNumber(properties, 'dataOfmWidth')}),
            ...(readOptionalNumber(properties, 'dataOfmHeight') === undefined
              ? {}
              : {height: readOptionalNumber(properties, 'dataOfmHeight')})
          }
        })
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

function readOptionalNumber(properties: Properties | undefined, key: string): number | undefined {
  const value = properties?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readBoolean(properties: Properties | undefined, key: string): boolean {
  return properties?.[key] === true
}
