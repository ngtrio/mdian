import type {OfmRehypeFeature} from '../feature.js'

import {anchorHast} from './hast.js'

export const anchorRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: (options) => anchorHast(options)
}

export {anchorHast} from './hast.js'
