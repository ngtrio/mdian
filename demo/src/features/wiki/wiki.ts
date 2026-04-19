import {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from 'mdian'
import {demoWikiPages, type DemoWikiPage} from '../../fixtures/wiki-pages.js'

export {demoWikiPages}
export type {DemoWikiPage}

export interface DemoWikiEmbed {
  markdown: string
  path: string
  permalink: string
  title: string
}

const pageMap = new Map(demoWikiPages.map((page) => [page.path, page]))

export function buildWikiHref(path: string, fragment?: string): string {
  const normalizedPath = normalizeOfmPath(path)
  const normalizedFragment = fragment ? decodeOfmFragment(fragment) : ''

  return buildOfmTargetUrl(
    {
      path: normalizedPath,
      permalink: normalizedFragment ? `${normalizedPath}#${normalizedFragment}` : normalizedPath,
      ...(normalizedFragment.startsWith('^') ? {blockId: normalizedFragment.slice(1)} : {})
    },
    'wiki'
  )
}

export function getDemoWikiPage(path: string): DemoWikiPage | undefined {
  return pageMap.get(normalizeWikiPath(path))
}

export function getDemoWikiEmbed(path: string, permalink?: string): DemoWikiEmbed | undefined {
  const page = getDemoWikiPage(path)

  if (!page) {
    return undefined
  }

  const fragment = extractFragment(permalink)

  if (!fragment) {
    return {
      markdown: stripRootHeading(page.markdown),
      path: page.path,
      permalink: permalink || page.path,
      title: page.title
    }
  }

  if (fragment.startsWith('^')) {
    const blockMarkdown = extractBlockMarkdown(page.markdown, fragment.slice(1))

    if (blockMarkdown) {
      return {
        markdown: blockMarkdown,
        path: page.path,
        permalink: `${page.path}#${fragment}`,
        title: `${page.title}#${fragment}`
      }
    }
  }

  const sectionMarkdown = extractHeadingSection(page.markdown, fragment)

  if (sectionMarkdown) {
    return {
      markdown: sectionMarkdown,
      path: page.path,
      permalink: `${page.path}#${fragment}`,
      title: `${page.title}#${fragment}`
    }
  }

  return {
    markdown: stripRootHeading(page.markdown),
    path: page.path,
    permalink: permalink || page.path,
    title: page.title
  }
}

export function normalizeWikiPath(path: string): string {
  return normalizeOfmPath(path)
}

function extractFragment(permalink?: string): string {
  if (!permalink) {
    return ''
  }

  const hashIndex = permalink.indexOf('#')
  return hashIndex === -1 ? '' : decodeOfmFragment(permalink.slice(hashIndex))
}

function stripRootHeading(markdown: string): string {
  const lines = markdown.split('\n')

  if (!lines[0]?.startsWith('# ')) {
    return markdown
  }

  let index = 1

  while (index < lines.length && lines[index] === '') {
    index += 1
  }

  return lines.slice(index).join('\n')
}

function extractHeadingSection(markdown: string, heading: string): string | undefined {
  const lines = markdown.split('\n')
  const normalizedHeading = heading.trim().toLowerCase()
  let start = -1
  let level = 0

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.*)$/.exec(lines[index])

    if (!match) {
      continue
    }

    const currentHeading = match[2].trim().toLowerCase()

    if (currentHeading === normalizedHeading) {
      start = index
      level = match[1].length
      break
    }
  }

  if (start === -1) {
    return undefined
  }

  let end = lines.length

  for (let index = start + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+/.exec(lines[index])

    if (match && match[1].length <= level) {
      end = index
      break
    }
  }

  return lines.slice(start, end).join('\n').trim()
}

function extractBlockMarkdown(markdown: string, blockId: string): string | undefined {
  const lines = markdown.split('\n')
  const matcher = new RegExp(`\\^(?:${escapeRegExp(blockId)})\\s*$`)

  for (let index = 0; index < lines.length; index += 1) {
    if (!matcher.test(lines[index])) {
      continue
    }

    let start = index
    while (start > 0 && lines[start - 1] !== '') {
      start -= 1
    }

    let end = index + 1
    while (end < lines.length && lines[end] !== '') {
      end += 1
    }

    return lines.slice(start, end).join('\n').trim()
  }

  return undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
