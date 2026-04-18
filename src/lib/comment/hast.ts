import type { Root, RootContent } from 'hast'

export function commentHast() {
  return function transform(node: Root | RootContent): boolean {
    return (
      node.type === 'element' &&
      node.properties.dataOfmKind === 'comment'
    )
  }
}
