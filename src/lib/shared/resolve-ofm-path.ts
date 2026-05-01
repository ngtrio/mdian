import type {OfmRehypeOptions} from '../types.js'

export function resolveOfmPath(path: string, options: Pick<OfmRehypeOptions, 'resolvePathCandidates'>): string {
  const candidates = options.resolvePathCandidates?.(path) ?? []
  const firstCandidate = candidates[0]

  if (typeof firstCandidate === 'string' && firstCandidate.length > 0) {
    return firstCandidate
  }

  return path
}
