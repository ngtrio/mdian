import type {Literal, Parent, PhrasingContent} from 'mdast'
import type {Options as GfmMicromarkOptions} from 'micromark-extension-gfm'
import type {Options as MathMicromarkOptions} from 'micromark-extension-math'

export interface OfmOptions {
  blockIds?: boolean
  callouts?: boolean
  comments?: boolean
  embeds?: boolean
  highlights?: boolean
  wikilinks?: boolean
}

export interface WikiReferenceFields {
  alias?: string | null | undefined
  blockId?: string | null | undefined
  path: string
  permalink: string
  value: string
}

export interface WikiLink extends Literal, WikiReferenceFields {
  type: 'wikiLink'
}

export interface Embed extends Literal, WikiReferenceFields {
  type: 'embed'
}

export interface Highlight extends Parent {
  type: 'highlight'
  children: PhrasingContent[]
}

export interface Options extends GfmMicromarkOptions, MathMicromarkOptions, OfmOptions {}

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
