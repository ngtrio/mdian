import {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from 'mdian'

export interface DemoWikiPage {
  markdown: string
  path: string
  summary: string
  title: string
}

export interface DemoWikiEmbed {
  markdown: string
  path: string
  permalink: string
  title: string
}

export const demoWikiPages: DemoWikiPage[] = [
  {
    path: 'Page',
    title: 'Page',
    summary: 'Generic demo page used by the basic wikilink, heading, and block reference examples.',
    markdown: [
      '# Page',
      '',
      'A compact note used by the demo to prove that wikilinks now navigate to a real page route.',
      '',
      '## Heading',
      '',
      'This heading is the destination for `[[Page#Heading]]`.',
      '',
      'This paragraph is the destination for `[[Page#^block-id]]`. ^block-id',
      '',
      '## Related notes',
      '',
      'Continue with [[Project Notes#Overview]] or jump to [[Roadmap#^next-step]].'
    ].join('\n')
  },
  {
    path: 'Project Notes',
    title: 'Project Notes',
    summary: 'A richer note for the mixed showcase example, including heading targets and cross-note links.',
    markdown: [
      '# Project Notes',
      '',
      'A working note for the demo knowledge base.',
      '',
      '## Overview',
      '',
      'This section is the destination for `[[Project Notes#Overview]]` in the mixed showcase example.',
      '',
      'The demo keeps OFM parsing inside `react-markdown`, then routes wikilinks into the in-app wiki.',
      '',
      '## Navigation',
      '',
      '- Review the main reference page: [[Page#Heading]]',
      '- See the current implementation sequence: [[Roadmap#^next-step]]',
      '- Open a nested path example: [[Folder Name/Page Name#Heading Here]]'
    ].join('\n')
  },
  {
    path: 'Roadmap',
    title: 'Roadmap',
    summary: 'Tracks the remaining work in the demo and exposes a stable block target for block refs.',
    markdown: [
      '# Roadmap',
      '',
      'The next demo improvements are tracked here.',
      '',
      '## Next step',
      '',
      'Finish real wiki navigation, keep heading anchors stable, and make block references scroll correctly. ^next-step',
      '',
      '## Later',
      '',
      '- Tighten the final HTML contract',
      '- Add more nested note fixtures',
      '- Mirror a few parser edge cases in the demo content'
    ].join('\n')
  },
  {
    path: 'Folder Name/Page Name',
    title: 'Page Name',
    summary: 'Nested path example to show that multi-segment wikilinks resolve to routes correctly.',
    markdown: [
      '# Folder Name/Page Name',
      '',
      'This page demonstrates that the demo route handles nested wiki paths.',
      '',
      '## Heading Here',
      '',
      'If you landed here from a fragment link, nested routes and heading lookup are both working.'
    ].join('\n')
  }
]

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
