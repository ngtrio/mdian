import 'mdast'
import type {OfmComment} from './types.js'

declare module 'mdast' {
  interface PhrasingContentMap {
    comment: OfmComment
  }

  interface RootContentMap {
    comment: OfmComment
  }
}
