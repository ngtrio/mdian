import type {OfmRehypeFeature} from '../feature.js'

import {
  anchorHast,
  findOfmAnchorTarget,
  getOfmAnchorKeyFromHash,
  normalizeOfmAnchorKey
} from './hast.js'

export const anchorRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: (options) => anchorHast(options)
}

export {
  anchorHast,
  findOfmAnchorTarget,
  getOfmAnchorKeyFromHash,
  normalizeOfmAnchorKey
} from './hast.js'
