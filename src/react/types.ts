import type {ReactNode} from 'react'
import type {Components} from 'react-markdown'
import type {PluggableList} from 'unified'

import type {OfmRehypeOptions, OfmRemarkOptions} from '../lib/types.js'

export interface OfmInternalTarget {
  fragment?: string
  path: string
}

export interface RenderOfmWikiLinkInput {
  children?: ReactNode
  className?: string
  href: string
  title?: string
}

export interface OfmReactWikiLinkOptions {
  render?: (input: RenderOfmWikiLinkInput) => ReactNode
}

export interface OfmReactImageOptions {
  transformSrc?: (src: string, ofmPath?: string) => string
}

export interface ResolveOfmNoteEmbedResult {
  markdown: string
  title?: string
}

export interface ResolveOfmNoteEmbedInput {
  path: string
}

export interface OfmReactNoteEmbedOptions {
  maxDepth?: number
  resolve?: (input: ResolveOfmNoteEmbedInput) => ResolveOfmNoteEmbedResult
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
