import type { Literal } from 'mdast'

export interface OfmComment extends Literal {
  type: 'comment'
  value: string
}
