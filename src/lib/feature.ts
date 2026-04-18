import type {Root as HastRoot, RootContent} from 'hast'
import type {Root as MdastRoot} from 'mdast'
import type {Construct, Extension as SyntaxExtension} from 'micromark-util-types'
import type {Plugin, Processor} from 'unified'

import type {OfmRemarkOptions, OfmRehypeOptions} from './types.js'

export type OfmSyntaxBuilder = {
  text: Record<number, Construct>
  insideSpan: Array<Pick<Construct, 'resolveAll'>>
  attentionMarkers: number[]
}

export type RemarkTransform = (tree: MdastRoot) => void
export type RehypeTransform = (node: HastRoot | RootContent) => boolean | void

export interface OfmRemarkFeature {
  enabled: (options: OfmRemarkOptions) => boolean
  extendSyntax?: (builder: OfmSyntaxBuilder, options: OfmRemarkOptions) => void
  fromMarkdown?: (options: OfmRemarkOptions) => unknown
  createRemarkTransform?: (processor: Processor, options: OfmRemarkOptions) => RemarkTransform | void
}

export interface OfmRehypeFeature {
  createRehypeTransform: (options: OfmRehypeOptions) => RehypeTransform
}

export function createSyntaxBuilder(): OfmSyntaxBuilder {
  return {
    text: {},
    insideSpan: [],
    attentionMarkers: []
  }
}

export function buildSyntaxExtension(builder: OfmSyntaxBuilder): SyntaxExtension {
  return {
    text: builder.text,
    ...(builder.insideSpan.length === 0 ? {} : {insideSpan: {null: builder.insideSpan}}),
    ...(builder.attentionMarkers.length === 0 ? {} : {attentionMarkers: {null: builder.attentionMarkers}})
  }
}

export function createRemarkTransform(
  processor: Processor,
  plugin: Plugin<[OfmRemarkOptions?], MdastRoot>,
  options: OfmRemarkOptions
): RemarkTransform | void {
  const transform = plugin.call(processor, options)

  if (typeof transform !== 'function') {
    return
  }

  return function apply(tree: MdastRoot) {
    ;(transform as (tree: MdastRoot) => void)(tree)
  }
}
