import 'mdast'
import type { Embed } from './types.ts'


declare module 'mdast' {
  interface PhrasingContentMap {
    embed: Embed
  }

  interface RootContentMap {
    embed: Embed
  }
}
