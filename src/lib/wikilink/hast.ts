import type {Element, Properties, Root, RootContent} from 'hast'

import type {OfmRehypeOptions} from '../types.js'
import type { WikiLinkData } from './types.js'

const defaultResolveHref = (wikilink: WikiLinkData): string =>
  `#/wiki/${encodeURIComponent(wikilink.permalink || wikilink.path || wikilink.value)}`

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const resolveHref = options.resolveHref ?? defaultResolveHref
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const wikilink = getWikiLinkData(node)
    if (!wikilink) {
      return
    }

    const href = resolveHref(wikilink)

    if (href !== undefined) {
      node.properties.href = href
    }

    if (setTitle) {
      node.properties.title = wikilink.permalink || wikilink.path
    }
  }
}

function getWikiLinkData(node: Element): WikiLinkData | undefined {
  const properties = node.properties

  if (properties.dataOfmKind !== 'wikilink') {
    return undefined
  }

  return {
    kind: 'wikilink',
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

function readString(properties: Properties, key: string): string {
  const value = properties[key]
  return typeof value === 'string' ? value : ''
}

function readOptionalString(properties: Properties, key: string): string | undefined {
  const value = properties[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
