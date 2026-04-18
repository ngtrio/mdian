import type {Root, RootContent} from 'hast'

import {addClassName, ofmClassNames} from '../shared/class-name.js'

export function highlightHast(): (node: Root | RootContent) => void {
  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    if (node.properties.dataOfmKind !== 'highlight') {
      return
    }

    addClassName(node.properties, ofmClassNames.highlight)
    clearOfmDataProps(node.properties)
  }
}

function clearOfmDataProps(properties?: Record<string, unknown>): void {
  if (!properties) {
    return
  }

  delete properties.dataOfmKind
}
