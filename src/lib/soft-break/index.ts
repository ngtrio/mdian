import type {OfmRemarkFeature} from '../feature.js'

import {softBreakRemark} from './remark.js'

export const softBreakRemarkFeature: OfmRemarkFeature = {
  enabled: () => true,
  createRemarkTransform: () => softBreakRemark()
}

export {softBreakRemark} from './remark.js'
