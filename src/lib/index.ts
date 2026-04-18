import type { Processor, Plugin } from 'unified'
import type { Root as HastRoot, RootContent } from 'hast'
import type { Root as MdastRoot } from 'mdast'
import {
  buildSyntaxExtension,
  createSyntaxBuilder,
  type OfmRehypeFeature,
  type OfmRemarkFeature,
  type RemarkTransform
} from './feature.js'
import { anchorRehypeFeature } from './anchor/index.js'
import { calloutRehypeFeature, calloutRemarkFeature } from './callout/index.js'
import { commentRehypeFeature, commentRemarkFeature } from './comment/index.js'
import { embedRehypeFeature, embedRemarkFeature } from './embed/index.js'
import { highlightRehypeFeature, highlightRemarkFeature } from './highlight/index.js'
import type { OfmRemarkOptions, OfmRehypeOptions } from './types.js'
import { wikiLinkRehypeFeature, wikiLinkRemarkFeature } from './wikilink/index.js'

type BucketKey = 'micromarkExtensions' | 'fromMarkdownExtensions'
type ExtensionBucket = Array<unknown>

const remarkFeatures: OfmRemarkFeature[] = [
  commentRemarkFeature,
  wikiLinkRemarkFeature,
  embedRemarkFeature,
  highlightRemarkFeature,
  calloutRemarkFeature
]

const rehypeFeatures: OfmRehypeFeature[] = [
  anchorRehypeFeature,
  calloutRehypeFeature,
  wikiLinkRehypeFeature,
  embedRehypeFeature,
  highlightRehypeFeature,
  commentRehypeFeature
]

export function getBucket(processor: Processor, key: BucketKey): ExtensionBucket {
  const data = processor.data() as Record<BucketKey, ExtensionBucket | undefined>
  const existing = data[key]

  if (Array.isArray(existing)) {
    return existing
  }

  const created: ExtensionBucket = []
  data[key] = created
  return created
}

export const remarkOfm: Plugin<[OfmRemarkOptions?], MdastRoot> = function remarkOfm(this: Processor, options: OfmRemarkOptions = {}) {
  getBucket(this, 'micromarkExtensions').push(ofmSyntex(options))

  const fromMarkdownExtensions: unknown[] = []
  const transforms: RemarkTransform[] = []

  for (const feature of remarkFeatures) {
    if (!feature.enabled(options)) {
      continue
    }

    if (feature.fromMarkdown) {
      fromMarkdownExtensions.push(feature.fromMarkdown(options))
    }

    if (feature.createRemarkTransform) {
      const transform = feature.createRemarkTransform(this, options)
      if (typeof transform === 'function') {
        transforms.push(transform)
      }
    }
  }

  getBucket(this, 'fromMarkdownExtensions').push(...fromMarkdownExtensions)

  if (transforms.length === 0) {
    return
  }

  return function transform(tree: MdastRoot) {
    for (const apply of transforms) {
      apply(tree)
    }
  }
}

export function ofmSyntex(options: OfmRemarkOptions = {}) {
  const builder = createSyntaxBuilder()

  for (const feature of remarkFeatures) {
    if (!feature.enabled(options) || !feature.extendSyntax) {
      continue
    }

    feature.extendSyntax(builder, options)
  }

  return buildSyntaxExtension(builder)
}

export const rehypeOfm: Plugin<[OfmRehypeOptions?], HastRoot> = function rehypeOfm(options = {}) {
  const transforms = rehypeFeatures.map((feature) => feature.createRehypeTransform(options))

  return function transform(tree: HastRoot) {
    visit(tree, (node) => {
      for (const apply of transforms) {
        if (apply(node) === true) {
          return true
        }
      }

      return
    })
  }
}

function visit(node: HastRoot | RootContent, visitor: (node: HastRoot | RootContent) => boolean | void): boolean {
  if (visitor(node) === true) {
    return true
  }

  if ('children' in node && Array.isArray(node.children)) {
    for (let index = 0; index < node.children.length;) {
      const child = node.children[index]

      if (!child) {
        index++
        continue
      }

      if (visit(child, visitor)) {
        node.children.splice(index, 1)
        continue
      }

      index++
    }
  }

  return false
}

export {findOfmAnchorTarget, normalizeOfmAnchorKey} from './anchor/index.js'
export {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from './shared/ofm-url.js'
