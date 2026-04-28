import type {Literal} from 'mdast'

export interface EmbedSize {
  height?: number
  width?: number
}

interface EmbedFields {
  alias?: string | null
  blockId?: string | null
  path: string
  permalink: string
  size?: EmbedSize
  value: string
}

export interface Embed extends Literal, EmbedFields {
  type: 'embed'
}
