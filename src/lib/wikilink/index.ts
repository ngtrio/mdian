import {codes} from 'micromark-util-symbol'

import type {OfmRehypeFeature, OfmRemarkFeature} from '../feature.js'

import {wikiLinkHast} from './hast.js'
import {wikiLinkMast} from './mdast.js'
import {wikiLinkTokenizer} from './tokenizer.js'

export const wikiLinkRemarkFeature: OfmRemarkFeature = {
  enabled: (options) => options.wikilinks ?? true,
  extendSyntax(builder) {
    builder.text[codes.leftSquareBracket] = wikiLinkTokenizer
  },
  fromMarkdown: wikiLinkMast
}

export const wikiLinkRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: (options) => wikiLinkHast(options)
}

export {wikiLinkMast} from './mdast.js'
export {wikiLinkHast} from './hast.js'
export {wikiLinkTokenizer} from './tokenizer.js'
