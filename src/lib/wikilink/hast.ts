import type {Root, RootContent} from 'hast'

import type {OfmRehypeOptions} from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {setOfmPublicProps, getOfmPublicFragment} from '../shared/public-props.js'
import { buildOfmTargetUrl } from '../shared/ofm-url.js'

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const ofmNode = getOfmNodeData(node.properties)

    if (ofmNode?.kind !== 'wikilink') {
      return
    }

    const fragment = getOfmPublicFragment(ofmNode.permalink)

    node.properties.href = buildOfmTargetUrl(ofmNode, options.hrefPrefix)
    setOfmPublicProps(node.properties, {
      kind: 'wikilink',
      path: ofmNode.path,
      permalink: ofmNode.permalink,
      ...(ofmNode.alias === undefined ? {} : {alias: ofmNode.alias}),
      ...(ofmNode.blockId === undefined ? {} : {blockId: ofmNode.blockId}),
      ...(fragment === undefined ? {} : {fragment})
    })
    addClassName(node.properties, ofmClassNames.wikilink)

    if (setTitle) {
      node.properties.title = ofmNode.permalink || ofmNode.path
    } else {
      delete node.properties.title
    }

    stripOfmDataProps(node.properties)
  }
}
