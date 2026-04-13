import type { Parent, PhrasingContent } from "mdast"

export interface Highlight extends Parent {
  type: 'highlight'
  children: PhrasingContent[]
}