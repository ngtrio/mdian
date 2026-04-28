export interface OfmTargetUrlInput {
  blockId?: string | null
  path: string
  permalink: string
}

export function buildOfmTargetUrl(target: OfmTargetUrlInput, prefix?: string): string {
  return `/${joinPathSegments(prefix, encodeOfmPath(normalizeOfmPath(target.path)))}${getOfmFragment(target)}`
}

export function normalizeOfmPath(path: string): string {
  return path
    .split('/')
    .map((segment) => decodeUriComponentSafe(segment.trim()))
    .filter(Boolean)
    .join('/')
}

export function decodeOfmFragment(value: string): string {
  const fragment = value.startsWith('#') ? value.slice(1) : value
  return decodeUriComponentSafe(fragment)
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

function decodeUriComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
