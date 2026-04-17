import type {PluggableList} from 'unified'

import rehypeKatex from 'rehype-katex'
import {rehypeOfm, remarkOfm, type OfmRemarkOptions, type OfmRehypeOptions} from 'mdian'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

export interface DemoMarkdownFeatures {
  gfm: boolean
  math: boolean
}

export const defaultDemoRehypeOptions: OfmRehypeOptions = {
  renderBlockAnchorLabels: true
}

export function buildRemarkPlugins(ofmOptions: OfmRemarkOptions, features: DemoMarkdownFeatures): PluggableList {
  const plugins: PluggableList = []

  if (features.gfm) {
    plugins.push(remarkGfm)
  }

  if (features.math) {
    plugins.push(remarkMath)
  }

  plugins.push([remarkOfm, ofmOptions])
  return plugins
}

export function buildRehypePlugins(ofmOptions: OfmRehypeOptions, features: DemoMarkdownFeatures): PluggableList {
  const plugins: PluggableList = []

  if (features.math) {
    plugins.push(rehypeKatex)
  }

  plugins.push([rehypeOfm, ofmOptions])
  return plugins
}
