import type {ReactNode} from 'react'
import type {Components} from 'react-markdown'
import type {Pluggable} from 'unified'

import {rehypeOfm, remarkOfm} from '../lib/index.js'
import type {OfmRehypeOptions, OfmRemarkOptions} from '../lib/types.js'
import {createOfmComponents} from './ofm-components.js'

export type OfmMarkdownOptions = OfmRemarkOptions & OfmRehypeOptions

interface OfmWikiLinkRendererProps {
  alias?: string
  blockId?: string
  children?: ReactNode
  className?: string
  fragment?: string
  href?: string
  path: string
  permalink: string
}

interface OfmNoteEmbedRendererProps {
  blockId?: string
  children?: ReactNode
  className?: string
  fragment?: string
  href?: string
  path: string
  permalink: string
  title?: string
}

interface OfmReactMarkdownOptions {
  components?: {
    renderNoteEmbed?: (props: OfmNoteEmbedRendererProps) => ReactNode
    renderWikiLink?: (props: OfmWikiLinkRendererProps) => ReactNode
  }
  reactComponents?: Components
  ofm?: OfmMarkdownOptions
}

interface OfmReactMarkdownAdapter {
  components?: Components
  remarkPlugin: Pluggable
  rehypePlugin: Pluggable
}

export function createOfmReactMarkdown(options: OfmReactMarkdownOptions = {}): OfmReactMarkdownAdapter {
  const {components, reactComponents, ofm = {}} = options
  const {
    callouts,
    comments,
    embeds,
    highlights,
    wikilinks,
    externalEmbeds,
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
    ...(externalEmbeds === undefined ? {} : {externalEmbeds}),
    ...(hrefPrefix === undefined ? {} : {hrefPrefix}),
    ...(renderBlockAnchorLabels === undefined ? {} : {renderBlockAnchorLabels}),
    ...(setTitle === undefined ? {} : {setTitle})
  })
  const componentMap = components ? createOfmComponents(components) : undefined
  const mergedComponents: Components | undefined = componentMap === undefined
    ? reactComponents
    : {
        ...(reactComponents ?? {}),
        ...componentMap
      }

  return {
    remarkPlugin: [remarkOfm, remarkOptions],
    rehypePlugin: [rehypeOfm, rehypeOptions],
    ...(mergedComponents === undefined ? {} : {components: mergedComponents})
  }
}

function compactDefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, entry]) => entry !== undefined)
  ) as T
}
