export interface OfmTargetUrlInput {
  fragment?: string | null
  path: string
}

export function buildOfmTargetUrl(target: OfmTargetUrlInput, prefix?: string): string {
  return `/${joinPathSegments(prefix, encodeOfmPath(normalizeOfmPath(target.path)))}${formatOfmHash(target.fragment)}`
}

export function formatOfmTargetLabel(target: OfmTargetUrlInput): string {
  if (!target.fragment) {
    return target.path
  }

  return `${target.path}#${target.fragment}`
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

export function normalizeOfmFragmentAnchorKey(value: string | null | undefined): string {
  const fragment = decodeOfmFragment(value ?? '').trim()

  if (!fragment) {
    return ''
  }

  return fragment
    .split('#')
    .map((segment) => normalizeOfmAnchorSegment(segment))
    .filter(Boolean)
    .join('#')
}

export function isOfmBlockFragment(fragment: string | null | undefined): boolean {
  return decodeOfmFragment(fragment ?? '').trim().startsWith('^')
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

function formatOfmHash(fragment: string | null | undefined): string {
  if (!fragment) {
    return ''
  }

  return `#${fragment}`
}

function normalizeOfmAnchorSegment(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function decodeUriComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
