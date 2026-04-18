import type {OfmRehypeFeature, OfmRemarkFeature} from '../feature.js'
import {createRemarkTransform} from '../feature.js'

import {calloutHast} from './hast.js'
import {calloutRemark} from './remark.js'

export const calloutRemarkFeature: OfmRemarkFeature = {
  enabled: (options) => options.callouts ?? true,
  createRemarkTransform: (processor, options) => createRemarkTransform(processor, calloutRemark, options)
}

export const calloutRehypeFeature: OfmRehypeFeature = {
  createRehypeTransform: () => calloutHast()
}

export {calloutHast} from './hast.js'
export {calloutRemark} from './remark.js'
