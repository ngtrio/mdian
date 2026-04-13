export interface OfmTargetUrlInput {
  blockId?: string | null | undefined
  path: string
  permalink: string
}

export function buildOfmTargetUrl(target: OfmTargetUrlInput, prefix?: string): string {
  return `/${joinPathSegments(prefix, encodeOfmPath(target.path))}${getOfmFragment(target)}`
}

function joinPathSegments(...segments: Array<string | undefined>): string {
  return segments
    .flatMap((segment) => segment && segment.length > 0 ? [segment] : [])
    .join('/')
}

function encodeOfmPath(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function getOfmFragment(target: OfmTargetUrlInput): string {
  if (target.blockId) {
    return `#^${target.blockId}`
  }

  const hashIndex = target.permalink.indexOf('#')
  return hashIndex === -1 ? '' : target.permalink.slice(hashIndex)
}
