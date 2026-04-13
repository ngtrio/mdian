import type { EmbedData } from './embed/types.js'

export interface OfmRemarkOptions {
}

export interface OfmRehypeOptions {
  hrefPrefix?: string
  resolveEmbed?: OfmEmbedSrcResolver
  setTitle?: boolean
}

export type OfmEmbedSrcResolver = (embed: EmbedData) => string | undefined

