export interface OfmTargetUrlInput {
  fragment?: string | null
  path: string
}

export function buildOfmTargetUrl(target: OfmTargetUrlInput, prefix?: string): string {
  return `/${joinPathSegments(prefix, buildOfmSlugPath(normalizeOfmPath(target.path)))}${formatOfmHash(buildOfmSlugFragment(target.fragment))}`
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

  return buildOfmSlugFragment(fragment)
}

export function isOfmBlockFragment(fragment: string | null | undefined): boolean {
  return decodeOfmFragment(fragment ?? '').trim().startsWith('^')
}

function joinPathSegments(...segments: Array<string | undefined>): string {
  return segments
    .flatMap((segment) => segment && segment.length > 0 ? [segment] : [])
    .join('/')
}

function buildOfmSlugPath(path: string): string {
  return path
    .split('/')
    .map((segment) => slugifyOfmPathSegment(segment))
    .join('/')
}

function slugifyOfmPathSegment(segment: string): string {
  return segment
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildOfmSlugFragment(fragment: string | null | undefined): string {
  const normalizedFragment = decodeOfmFragment(fragment ?? '').trim()

  if (!normalizedFragment) {
    return ''
  }

  return normalizedFragment
    .split('#')
    .map((segment) => slugifyOfmFragmentSegment(segment))
    .filter(Boolean)
    .join('#')
}

function slugifyOfmFragmentSegment(segment: string): string {
  const trimmed = segment.trim()

  if (!trimmed) {
    return ''
  }

  if (trimmed.startsWith('^')) {
    const blockId = slugifyOfmPathSegment(trimmed.slice(1))
    return blockId ? `^${blockId}` : ''
  }

  return slugifyOfmPathSegment(trimmed)
}

function formatOfmHash(fragment: string | null | undefined): string {
  if (!fragment) {
    return ''
  }

  return `#${fragment}`
}

function decodeUriComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
