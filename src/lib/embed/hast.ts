import type { Element, Properties, Root, RootContent } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import { buildOfmTargetUrl } from '../ofm-url.js'
import type { EmbedData } from './types.js'

type MutableElementWithoutChildren = Omit<Element, 'children'> & {
  children?: RootContent[]
}

export function embedHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const resolveEmbed = options.resolveEmbed
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const embed = getEmbedData(node)

    if (!embed) {
      return
    }

    const src = resolveEmbed?.(embed) ?? buildOfmTargetUrl(embed, options.hrefPrefix)
    const imageNode = node as MutableElementWithoutChildren

    imageNode.tagName = 'img'
    imageNode.properties.src = src
    imageNode.properties.alt = embed.value
    delete imageNode.children

    if (setTitle) {
      imageNode.properties.title = embed.permalink || embed.path
    }
  }
}

function getEmbedData(node: Element): EmbedData | undefined {
  if (node.tagName !== 'span') {
    return undefined
  }

  const properties = node.properties

  if (properties.dataOfmKind !== 'embed') {
    return undefined
  }

  return {
    kind: 'embed',
    value: readString(properties, 'dataOfmValue'),
    path: readString(properties, 'dataOfmPath'),
    permalink: readString(properties, 'dataOfmPermalink'),
    ...(readOptionalString(properties, 'dataOfmAlias') === undefined
      ? {}
      : { alias: readOptionalString(properties, 'dataOfmAlias') }),
    ...(readOptionalString(properties, 'dataOfmBlockId') === undefined
      ? {}
      : { blockId: readOptionalString(properties, 'dataOfmBlockId') })
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
