import 'mdast'
import type {WikiLink} from './types.js'


declare module 'mdast' {
  interface PhrasingContentMap {
    wikiLink: WikiLink
  }

  interface RootContentMap {
    wikiLink: WikiLink
  }
}
