import {rehypeOfm, remarkOfm} from '../lib/index.js'
import {createOfmReactComponents} from './components.js'
import type {OfmReactPreset, OfmReactPresetOptions} from './types.js'

export function createOfmReactPreset(options: OfmReactPresetOptions = {}): OfmReactPreset {
  return {
    components: createOfmReactComponents(options),
    remarkPlugins: [...(options.markdown?.remarkPlugins ?? []), [remarkOfm, options.ofm?.remark ?? {}]],
    rehypePlugins: [...(options.markdown?.rehypePlugins ?? []), [rehypeOfm, options.ofm?.rehype ?? {}]]
  }
}
