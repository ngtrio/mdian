import type { WikiLink, WikiLinkData } from './wikilink/types.js'
import type { Embed, EmbedData } from './embed/types.js'

export interface OfmRemarkOptions {
}

export interface OfmRehypeOptions {
  resolveHref?: OfmWikiLinkHrefResolver
  resolveEmbed?: OfmEmbedSrcResolver
  setTitle?: boolean
}


export type OfmWikiLinkHrefResolver = (wikilink: WikiLinkData) => string | undefined
export type OfmEmbedSrcResolver = (embed: EmbedData) => string | undefined

