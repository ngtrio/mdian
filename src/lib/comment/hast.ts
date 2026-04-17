import type { Root, RootContent } from 'hast'

import { getOfmNodeData } from '../ofm-node.js'

export function commentHast() {
  return function transform(node: Root | RootContent): boolean {
    return (
      node.type === 'element' &&
      getOfmNodeData(node.properties)?.kind === 'comment'
    )
  }
}
