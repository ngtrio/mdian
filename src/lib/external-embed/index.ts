import type {OfmRehypeFeature} from '../feature.js'

import {externalEmbedHast} from './hast.js'

export const externalEmbedRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: (options) => externalEmbedHast(options)
}

export {externalEmbedHast} from './hast.js'
