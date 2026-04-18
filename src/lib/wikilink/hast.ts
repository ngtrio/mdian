import type {Element, Properties, Root, RootContent} from 'hast'

import type {WikiLinkData} from './types.js'
import type {OfmRehypeOptions} from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import { buildOfmTargetUrl } from '../shared/ofm-url.js'

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const buildHref = (wikilink: WikiLinkData): string =>
    buildOfmTargetUrl(wikilink, options.hrefPrefix)

  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const ofmNode = getOfmNodeData(node.properties)

    if (ofmNode?.kind !== 'wikilink') {
      return
    }

    node.properties.href = buildHref(ofmNode)
    addClassName(node.properties, ofmClassNames.wikilink)

    if (setTitle) {
      node.properties.title = ofmNode.permalink || ofmNode.path
    }

    clearOfmDataProps(node.properties)
  }
}

const wikiLinkDataPropNames = [
  'dataOfmAlias',
  'dataOfmBlockId',
  'dataOfmKind',
  'dataOfmPath',
  'dataOfmPermalink',
  'dataOfmValue'
] as const

function getOfmNodeData(properties?: Properties): WikiLinkData | undefined {
  if (properties?.dataOfmKind !== 'wikilink') {
    return undefined
  }

  const value = readString(properties, 'dataOfmValue')
  const path = readString(properties, 'dataOfmPath')
  const permalink = readString(properties, 'dataOfmPermalink')
  const alias = readOptionalString(properties, 'dataOfmAlias')
  const blockId = readOptionalString(properties, 'dataOfmBlockId')

  return {
    kind: 'wikilink',
    value,
    path,
    permalink,
    ...(alias === undefined ? {} : {alias}),
    ...(blockId === undefined ? {} : {blockId})
  }
}

function clearOfmDataProps(properties?: Properties | Record<string, unknown>): void {
  if (!properties) {
    return
  }

  for (const key of wikiLinkDataPropNames) {
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
