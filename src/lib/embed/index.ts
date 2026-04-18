import {codes} from 'micromark-util-symbol'

import type {OfmRehypeFeature, OfmRemarkFeature} from '../feature.js'

import {embedHast} from './hast.js'
import {embedMast} from './mdast.js'
import {embedTokenizer} from './tokenizer.js'

export const embedRemarkFeature: OfmRemarkFeature = {
  enabled: (options) => options.embeds ?? true,
  extendSyntax(builder) {
    builder.text[codes.exclamationMark] = embedTokenizer
  },
  fromMarkdown: embedMast
}

export const embedRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: (options) => embedHast(options)
}

export {embedMast} from './mdast.js'
export {embedHast} from './hast.js'
export {embedTokenizer} from './tokenizer.js'
