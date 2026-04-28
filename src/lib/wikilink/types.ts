import type {Literal} from 'mdast'

interface WikiLinkFields {
  alias?: string | null
  blockId?: string | null
  path: string
  permalink: string
  value: string
}

export interface WikiLink extends Literal, WikiLinkFields {
  type: 'wikiLink'
}
