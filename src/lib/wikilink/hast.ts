import type {Element, Properties, Root, RootContent} from 'hast'

import type {OfmRehypeOptions} from '../types.js'
import {getOfmNodeData} from '../ofm-node.js'
import { buildOfmTargetUrl } from '../ofm-url.js'

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const buildHref = (wikilink: NonNullable<ReturnType<typeof getOfmNodeData>> & {kind: 'wikilink'}): string =>
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

    if (setTitle) {
      node.properties.title = ofmNode.permalink || ofmNode.path
    }
  }
}
