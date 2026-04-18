import type {Root, RootContent} from 'hast'

import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {stripOfmDataProps} from '../shared/ofm-node.js'
import {setOfmPublicProps} from '../shared/public-props.js'

export function highlightHast(): (node: Root | RootContent) => void {
  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    if (node.properties.dataOfmKind !== 'highlight') {
      return
    }

    setOfmPublicProps(node.properties, {kind: 'highlight'})
    addClassName(node.properties, ofmClassNames.highlight)
    stripOfmDataProps(node.properties)
  }
}
