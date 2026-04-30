import type {Properties} from 'hast'

interface OfmTargetNodeData {
  alias?: string
  fragment?: string
  path: string
  value: string
}

interface OfmEmbedSize {
  height?: number
  width?: number
}

export type OfmNodeData =
  | (OfmTargetNodeData & {
      kind: 'wikilink'
    })
  | (OfmTargetNodeData & {
      kind: 'embed'
      size?: OfmEmbedSize
    })
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
  'dataOfmAlias',
  'dataOfmCalloutType',
  'dataOfmCollapsed',
  'dataOfmFoldable',
  'dataOfmHeight',
  'dataOfmKind',
  'dataOfmPath',
  'dataOfmFragment',
  'dataOfmTitle',
  'dataOfmValue',
  'dataOfmWidth'
] as const

export function getOfmNodeData(properties?: Properties): OfmNodeData | undefined {
  const kind = readString(properties, 'dataOfmKind')

  switch (kind) {
    case 'wikilink': {
      const alias = readOptionalString(properties, 'dataOfmAlias')
      return {
        kind,
        value: readString(properties, 'dataOfmValue'),
        path: readString(properties, 'dataOfmPath'),
        ...(readOptionalString(properties, 'dataOfmFragment') === undefined
          ? {}
          : {fragment: readString(properties, 'dataOfmFragment')}),
        ...(alias === undefined ? {} : {alias})
      }
    }
    case 'embed': {
      const alias = readOptionalString(properties, 'dataOfmAlias')
      const width = readOptionalNumber(properties, 'dataOfmWidth')
      const height = readOptionalNumber(properties, 'dataOfmHeight')

      return {
        kind,
        value: readString(properties, 'dataOfmValue'),
        path: readString(properties, 'dataOfmPath'),
        ...(readOptionalString(properties, 'dataOfmFragment') === undefined
          ? {}
          : {fragment: readString(properties, 'dataOfmFragment')}),
        ...(alias === undefined ? {} : {alias}),
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

export function stripOfmDataProps<T extends Properties>(properties: T): T {
  for (const key of ofmDataPropNames) {
    delete properties[key]
  }

  return properties
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
