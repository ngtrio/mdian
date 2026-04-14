import 'mdast'
import type {Highlight} from './types.js'


declare module 'mdast' {
  interface PhrasingContentMap {
    highlight: Highlight
  }

  interface RootContentMap {
    highlight: Highlight
  }
}
