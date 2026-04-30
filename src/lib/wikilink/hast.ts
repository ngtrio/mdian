import type {Root, RootContent} from 'hast'

import type {OfmRehypeOptions} from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {ofmPublicKind, setOfmPublicProps} from '../shared/public-props.js'
import {buildOfmTargetUrl, formatOfmTargetLabel} from '../shared/ofm-url.js'

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const ofmNode = getOfmNodeData(node.properties)

    if (ofmNode?.kind !== ofmPublicKind.wikilink) {
      return
    }

    node.properties.href = buildOfmTargetUrl(ofmNode, options.hrefPrefix)
    setOfmPublicProps(node.properties, {
      kind: ofmPublicKind.wikilink,
      path: ofmNode.path,
      ...(ofmNode.alias === undefined ? {} : {alias: ofmNode.alias}),
      ...(ofmNode.fragment === undefined ? {} : {fragment: ofmNode.fragment})
    })
    addClassName(node.properties, ofmClassNames.wikilink)

    if (setTitle) {
      node.properties.title = formatOfmTargetLabel(ofmNode)
    } else {
      delete node.properties.title
    }

    stripOfmDataProps(node.properties)
  }
}
