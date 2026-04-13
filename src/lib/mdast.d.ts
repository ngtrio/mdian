import type { Literal, Parent, PhrasingContent } from 'mdast'

declare module 'mdast' {
  interface PhrasingContentMap {
    highlight: Highlight
    embed: Embed
    wikiLink: WikiLink
  }

  interface RootContentMap {
    highlight: Highlight
    embed: Embed
    wikiLink: WikiLink
  }
}
