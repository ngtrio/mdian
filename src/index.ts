import {
  findOfmAnchorTarget as findOfmAnchorTargetInternal
} from './lib/anchor/index.js'
import {
  buildOfmTargetUrl as buildOfmTargetUrlInternal,
  decodeOfmFragment,
  normalizeOfmPath
} from './lib/shared/ofm-url.js'

interface OfmTargetUrlInput {
  blockId?: string
  path: string
  permalink: string
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
