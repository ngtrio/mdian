import type {Root, RootContent} from 'hast'

import {addClassName, ofmClassNames} from '../class-name.js'
import {clearOfmDataProps, getOfmNodeData} from '../ofm-node.js'

export function highlightHast(): (node: Root | RootContent) => void {
  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const highlight = getOfmNodeData(node.properties)

    if (highlight?.kind !== 'highlight') {
      return
    }

    addClassName(node.properties, ofmClassNames.highlight)
    clearOfmDataProps(node.properties)
  }
}
