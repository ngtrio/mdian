import type {Properties} from 'hast'

export type OfmNodeData =
  | {
      kind: 'wikilink'
      value: string
      path: string
      permalink: string
      alias?: string
      blockId?: string
    }
  | {
      kind: 'embed'
      value: string
      path: string
      permalink: string
      alias?: string
      blockId?: string
      size?: {
        width?: number
        height?: number
      }
    }
  | {
      kind: 'comment'
      value: string
    }
  | {
      kind: 'highlight'
    }
  | {
      kind: 'callout'
      calloutType: string
      title: string
      foldable: boolean
      collapsed: boolean
    }

const ofmDataPropNames = [
  'data-anchor-key',
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
  'dataOfmWidth'
] as const

export function getOfmNodeData(properties?: Properties | Record<string, unknown>): OfmNodeData | undefined {
  const kind = readString(properties, 'dataOfmKind')

  switch (kind) {
    case 'wikilink': {
      const alias = readOptionalString(properties, 'dataOfmAlias')
      const blockId = readOptionalString(properties, 'dataOfmBlockId')
      return {
        kind,
        value: readString(properties, 'dataOfmValue'),
        path: readString(properties, 'dataOfmPath'),
        permalink: readString(properties, 'dataOfmPermalink'),
        ...(alias === undefined ? {} : {alias}),
        ...(blockId === undefined ? {} : {blockId})
      }
    }
    case 'embed': {
      const alias = readOptionalString(properties, 'dataOfmAlias')
      const blockId = readOptionalString(properties, 'dataOfmBlockId')
      const width = readOptionalNumber(properties, 'dataOfmWidth')
      const height = readOptionalNumber(properties, 'dataOfmHeight')

      return {
        kind,
        value: readString(properties, 'dataOfmValue'),
        path: readString(properties, 'dataOfmPath'),
        permalink: readString(properties, 'dataOfmPermalink'),
        ...(alias === undefined ? {} : {alias}),
        ...(blockId === undefined ? {} : {blockId}),
        ...(width === undefined && height === undefined
          ? {}
          : {
              size: {
                ...(width === undefined ? {} : {width}),
                ...(height === undefined ? {} : {height})
              }
            })
      }
    }
    case 'comment':
      return {
        kind,
        value: readString(properties, 'dataOfmValue')
      }
    case 'highlight':
      return {kind}
    case 'callout':
      return {
        kind,
        calloutType: readString(properties, 'dataOfmCalloutType'),
        title: readString(properties, 'dataOfmTitle'),
        foldable: readBoolean(properties, 'dataOfmFoldable'),
        collapsed: readBoolean(properties, 'dataOfmCollapsed')
      }
    default:
      return undefined
  }
}

export function stripOfmDataProps<T extends Properties | Record<string, unknown>>(properties: T): T {
  for (const key of ofmDataPropNames) {
    delete properties[key]
  }

  return properties
}

function readString(properties: Properties | Record<string, unknown> | undefined, key: string): string {
  const value = properties?.[key]
  return typeof value === 'string' ? value : ''
}

function readOptionalString(properties: Properties | Record<string, unknown> | undefined, key: string): string | undefined {
  const value = properties?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function readOptionalNumber(properties: Properties | Record<string, unknown> | undefined, key: string): number | undefined {
  const value = properties?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readBoolean(properties: Properties | Record<string, unknown> | undefined, key: string): boolean {
  return properties?.[key] === true
}
