import type { Literal } from "mdast"

export interface WikiLinkData {
  alias?: string | null | undefined
  blockId?: string | null | undefined
  kind: 'wikilink'
  path: string
  permalink: string
  value: string
}

export interface WikiLink extends Literal {
  type: 'wikiLink'
  alias?: string | null | undefined
  blockId?: string | null | undefined
  path: string
  permalink: string
  value: string
}
