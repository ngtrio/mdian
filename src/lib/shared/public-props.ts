import type {Properties} from 'hast'

import {decodeOfmFragment} from './ofm-url.js'

export type OfmPublicKind = 'anchor-target' | 'callout' | 'embed' | 'highlight' | 'wikilink'
export type OfmPublicVariant = 'block' | 'file' | 'heading' | 'image' | 'note'

export interface OfmPublicPropsInput {
  alias?: string
  blockId?: string
  fragment?: string
  kind: OfmPublicKind
  path?: string
  permalink?: string
  variant?: OfmPublicVariant
}

export function setOfmPublicProps(properties: Properties | Record<string, unknown>, value: OfmPublicPropsInput): void {
  properties['data-ofm-kind'] = value.kind
  setOptionalString(properties, 'data-ofm-variant', value.variant)
  setOptionalString(properties, 'data-ofm-path', value.path)
  setOptionalString(properties, 'data-ofm-permalink', value.permalink)
  setOptionalString(properties, 'data-ofm-alias', value.alias)
  setOptionalString(properties, 'data-ofm-block-id', value.blockId)
  setOptionalString(properties, 'data-ofm-fragment', value.fragment)
}

export function getOfmPublicFragment(permalink: string): string | undefined {
  const hashIndex = permalink.indexOf('#')

  if (hashIndex === -1) {
    return undefined
  }

  const fragment = decodeOfmFragment(permalink.slice(hashIndex))
  return fragment.length > 0 ? fragment : undefined
}

function setOptionalString(properties: Properties | Record<string, unknown>, key: string, value: string | undefined): void {
  if (value && value.length > 0) {
    properties[key] = value
    return
  }

  delete properties[key]
}
