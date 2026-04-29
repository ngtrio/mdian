import type {ReactNode} from 'react'
import type {Components} from 'react-markdown'
import type {PluggableList} from 'unified'

import type {OfmRehypeOptions, OfmRemarkOptions} from '../lib/types.js'

export interface OfmReactTarget {
  blockId?: string
  fragment?: string
  path: string
}

export interface ResolvedOfmWikiLink {
  href: string
  title?: string
}

export interface RenderOfmWikiLinkInput {
  children?: ReactNode
  className?: string
  href: string
  resolved: ResolvedOfmWikiLink
  target: OfmReactTarget
  title?: string
}

export interface OfmReactWikiLinkOptions {
  render?: (input: RenderOfmWikiLinkInput) => ReactNode
  resolve?: (target: OfmReactTarget) => ResolvedOfmWikiLink | undefined
}

export interface OfmReactImageOptions {
  transformSrc?: (src: string) => string
}

export interface ResolveOfmNoteEmbedResult {
  markdown: string
  title?: string
}

export interface OfmReactNoteEmbedOptions {
  maxDepth?: number
  resolve?: (target: OfmReactTarget) => ResolveOfmNoteEmbedResult | undefined
}

export interface TwitterWidgetsApi {
  createTweet?: (
    tweetId: string,
    element: HTMLElement,
    options?: Record<string, unknown>
  ) => Promise<HTMLElement | undefined>
}

export interface OfmReactTwitterOptions {
  enhance?: boolean
  loadScript?: () => Promise<TwitterWidgetsApi>
}

export interface OfmReactExternalEmbedsOptions {
  twitter?: OfmReactTwitterOptions
}

export interface OfmReactPresetOptions {
  externalEmbeds?: OfmReactExternalEmbedsOptions
  image?: OfmReactImageOptions
  noteEmbed?: OfmReactNoteEmbedOptions
  ofm?: {
    rehype?: OfmRehypeOptions
    remark?: OfmRemarkOptions
  }
  wikiLink?: OfmReactWikiLinkOptions
}

export interface OfmReactPreset {
  components: Components
  rehypePlugins: PluggableList
  remarkPlugins: PluggableList
}
