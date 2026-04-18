import {codes} from 'micromark-util-symbol'

import type {OfmRehypeFeature, OfmRemarkFeature} from '../feature.js'

import {highlightHast} from './hast.js'
import {highlightMast} from './mdast.js'
import {highlightTokenizer} from './tokenizer.js'

export const highlightRemarkFeature: OfmRemarkFeature = {
  enabled: (options) => options.highlights ?? true,
  extendSyntax(builder) {
    builder.text[codes.equalsTo] = highlightTokenizer
    builder.insideSpan.push(highlightTokenizer)
    builder.attentionMarkers.push(codes.equalsTo)
  },
  fromMarkdown: highlightMast
}

export const highlightRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: () => highlightHast()
}

export {highlightMast} from './mdast.js'
export {highlightHast} from './hast.js'
export {highlightTokenizer} from './tokenizer.js'
