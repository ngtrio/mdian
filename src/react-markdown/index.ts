import type {Components} from 'react-markdown'
import type {Pluggable} from 'unified'

import {rehypeOfm, remarkOfm} from '../lib/index.js'
import type {OfmRehypeOptions, OfmRemarkOptions} from '../lib/types.js'
import {
  createOfmComponents,
  type CreateOfmComponentsOptions,
  type OfmNoteEmbedRendererProps,
  type OfmWikiLinkRendererProps
} from './ofm-components.js'

export type OfmMarkdownOptions = OfmRemarkOptions & OfmRehypeOptions

export interface OfmReactMarkdownOptions {
  components?: CreateOfmComponentsOptions
  ofm?: OfmMarkdownOptions
}

export interface OfmReactMarkdownAdapter {
  components?: Components
  remarkPlugin: Pluggable
  rehypePlugin: Pluggable
}

export function createOfmReactMarkdown(options: OfmReactMarkdownOptions = {}): OfmReactMarkdownAdapter {
  const {components, ofm = {}} = options
  const {
    callouts,
    comments,
    embeds,
    highlights,
    wikilinks,
    hrefPrefix,
    renderBlockAnchorLabels,
    setTitle
  } = ofm

  const remarkOptions = compactDefined<OfmRemarkOptions>({
    ...(callouts === undefined ? {} : {callouts}),
    ...(comments === undefined ? {} : {comments}),
    ...(embeds === undefined ? {} : {embeds}),
    ...(highlights === undefined ? {} : {highlights}),
    ...(wikilinks === undefined ? {} : {wikilinks})
  })
  const rehypeOptions = compactDefined<OfmRehypeOptions>({
    ...(hrefPrefix === undefined ? {} : {hrefPrefix}),
    ...(renderBlockAnchorLabels === undefined ? {} : {renderBlockAnchorLabels}),
    ...(setTitle === undefined ? {} : {setTitle})
  })
  const componentMap = components ? createOfmComponents(components) : undefined

  return {
    remarkPlugin: [remarkOfm, remarkOptions],
    rehypePlugin: [rehypeOfm, rehypeOptions],
    ...(componentMap === undefined ? {} : {components: componentMap})
  }
}

export {createOfmComponents}
export type {CreateOfmComponentsOptions, OfmNoteEmbedRendererProps, OfmWikiLinkRendererProps}

function compactDefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
  ) as T
}
