import type { EmbedData } from './embed/types.js'

export interface OfmRemarkOptions {
  embeds?: boolean
  highlights?: boolean
  wikilinks?: boolean
}

export interface OfmRehypeOptions {
  hrefPrefix?: string
  resolveEmbed?: OfmEmbedSrcResolver
  setTitle?: boolean
}

export type OfmEmbedSrcResolver = (embed: EmbedData) => string | undefined

