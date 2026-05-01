export interface OfmTargetUrlInput {
  fragment?: string | null
  path: string
}

export function buildOfmTargetHref(target: OfmTargetUrlInput, prefix?: string): string {
  return `/${joinPathSegments(prefix, buildOfmTargetPath(target))}`
}

export function buildOfmTargetPath(target: OfmTargetUrlInput): string {
  return `${buildOfmSlugPath(target.path)}${buildOfmFragmentHash(target.fragment)}`
}

export function buildOfmSlugPath(path: string): string {
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => slugifyOfmPathSegment(segment))
    .join('/')
}

export function buildOfmFragmentHash(fragment: string | null | undefined): string {
  const cleanFragment = readOfmFragment(fragment)
  return formatOfmHash(slugifyCleanOfmFragment(cleanFragment))
}

export function formatOfmTargetLabel(target: OfmTargetUrlInput): string {
  if (!target.fragment) {
    return target.path
  }

  return `${target.path}#${target.fragment}`
}

export function normalizeOfmFragmentAnchorKey(value: string | null | undefined): string {
  const fragment = readOfmFragment(value)

  if (!fragment) {
    return ''
  }

  return slugifyCleanOfmFragment(fragment)
}

export function isOfmBlockFragment(fragment: string | null | undefined): boolean {
  return readOfmFragment(fragment).startsWith('^')
}

function joinPathSegments(...segments: Array<string | undefined>): string {
  return segments
    .flatMap((segment) => segment && segment.length > 0 ? [segment] : [])
    .join('/')
}

function slugifyOfmPathSegment(segment: string): string {
  return segment
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

function slugifyCleanOfmFragment(cleanFragment: string): string {
  if (!cleanFragment) {
    return ''
  }

  return cleanFragment
    .split('#')
    .map((segment) => slugifyOfmFragmentSegment(segment))
    .filter(Boolean)
    .join('#')
}

function readOfmFragment(fragment: string | null | undefined): string {
  const rawFragment = fragment ?? ''
  const withoutHash = rawFragment.startsWith('#') ? rawFragment.slice(1) : rawFragment
  return withoutHash.trim()
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
