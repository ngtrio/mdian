import {
  findOfmAnchorTarget as findOfmAnchorTargetInternal
} from './lib/anchor/index.js'
import {
  buildOfmTargetUrl as buildOfmTargetUrlInternal,
  decodeOfmFragment,
  normalizeOfmPath
} from './lib/shared/ofm-url.js'
export {rehypeOfm, remarkOfm} from './lib/index.js'
export type {OfmRehypeOptions, OfmRemarkOptions} from './lib/types.js'

interface OfmTargetUrlInput {
  fragment?: string
  path: string
}

interface OfmAnchorTargetLike {
  dataset?: {
    anchorKey?: string
  }
}

interface OfmAnchorRootLike<T extends OfmAnchorTargetLike = OfmAnchorTargetLike> {
  querySelectorAll(selector: string): Iterable<T>
}

export function buildOfmTargetUrl(target: OfmTargetUrlInput, prefix?: string): string {
  return buildOfmTargetUrlInternal(target, prefix)
}

export function findOfmAnchorTarget<T extends OfmAnchorTargetLike>(
  root: OfmAnchorRootLike<T>,
  value: string | null | undefined
): T | undefined {
  return findOfmAnchorTargetInternal(root, value)
}

export {decodeOfmFragment, normalizeOfmPath}
