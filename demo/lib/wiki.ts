import {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from 'mdian'

export interface DemoWikiPage {
  markdown: string
  path: string
  summary: string
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

export function normalizeWikiPath(path: string): string {
  return normalizeOfmPath(path)
}
