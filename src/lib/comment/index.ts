import type {OfmRehypeFeature, OfmRemarkFeature} from '../feature.js'

import {commentHast} from './hast.js'
import {commentMast} from './mdast.js'
import {commentTokenizer} from './tokenizer.js'

const percentSign = '%'.charCodeAt(0)

export const commentRemarkFeature: OfmRemarkFeature = {
  enabled: (options) => options.comments ?? true,
  extendSyntax(builder) {
    builder.text[percentSign] = commentTokenizer
  },
  fromMarkdown: commentMast
}

export const commentRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: () => commentHast()
}

export {commentMast} from './mdast.js'
export {commentHast} from './hast.js'
export {commentTokenizer} from './tokenizer.js'
