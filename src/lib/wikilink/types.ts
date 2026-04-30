import type {Literal} from 'mdast'

interface WikiLinkFields {
  alias?: string | null
  fragment?: string | null
  path: string
  value: string
}

export interface WikiLink extends Literal, WikiLinkFields {
  type: 'wikiLink'
}
