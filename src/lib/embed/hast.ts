import type { Element, Root, RootContent } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import {addClassName, ofmClassNames} from '../class-name.js'
import { clearOfmDataProps, getOfmNodeData } from '../ofm-node.js'
import { buildOfmTargetUrl } from '../ofm-url.js'

export function embedHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const resolveEmbed = options.resolveEmbed
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const embed = getOfmNodeData(node.properties)

    if (embed?.kind !== 'embed') {
      return
    }

    const src = resolveEmbed?.(embed) ?? buildOfmTargetUrl(embed, options.hrefPrefix)

    node.tagName = 'img'
    node.properties.src = src
    node.properties.alt = embed.value
    addClassName(node.properties, ofmClassNames.embed)
    node.children = []

    if (setTitle) {
      node.properties.title = embed.permalink || embed.path
    }

    clearOfmDataProps(node.properties)
  }
}
