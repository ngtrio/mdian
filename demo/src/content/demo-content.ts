import {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from 'mdian'

export type DemoSampleKey =
  | 'wikilinks'
  | 'embeds'
  | 'external-embeds'
  | 'callouts'
  | 'highlights'
  | 'comments'

export interface DemoSample {
  key: DemoSampleKey
  markdown: string
  title: string
}

export const demoSamples: DemoSample[] = [
  {
    key: 'wikilinks',
    title: 'Wikilinks',
    markdown: [
      '# Research Hub',
      '',
      'Start with [[Project Notes|the main project note]] and then jump into [[Deep/Nested/Page]].',
      '',
      '## Reading list',
      '',
      '- [[Roadmap]]',
      '- [[Project Notes#Overview]]',
      '- [[Project Notes#Overview#Detail|Nested heading target]]',
      '- [[Roadmap#^next-step|Next milestone block]]',
      '',
      '## Fragment notes',
      '',
      '- Repeated `#` stays inside one fragment, so [[Project Notes#Overview#Detail]] targets a nested heading path.',
      '- Block refs stay fragment-only, so [[Roadmap#^next-step]] targets the block anchor.',
      '',
      'This sample is meant to read like a real note, not a syntax checklist.'
    ].join('\n')
  },
  {
    key: 'embeds',
    title: 'Embeds',
    markdown: [
      '# Embedded Assets',
      '',
      'A visual sample works best here because embeds justify the preview-first layout.',
      '![[assets/image.svg|320x180]]',
      '',
      '## Embedded note',
      '',
      '![[Project Notes]]',
      '',
      '## Embedded section',
      '',
      '![[Project Notes#Overview]]',
      '',
      '## Embedded nested section',
      '',
      '![[Project Notes#Overview#Detail]]',
      '',
      '## Embedded block',
      '',
      '![[Roadmap#^next-step]]',
      '',
      'The demo also shows block embeds separately so heading paths and block refs stay easy to compare.'
    ].join('\n')
  },
  {
    key: 'external-embeds',
    title: 'External Embeds',
    markdown: [
      '# External Embeds',
      '',
      'These start as normal markdown images, then `mdian` upgrades supported URLs during the rehype pass.',
      '',
      '## YouTube',
      '',
      '![Demo walkthrough](https://www.youtube.com/watch?v=dQw4w9WgXcQ)',
      '',
      '## X / Twitter',
      '',
      '![](https://x.com/jack/status/20)',
      '',
      'The editor source stays small because there is no custom shortcode to memorize.'
    ].join('\n')
  },
  {
    key: 'callouts',
    title: 'Callouts',
    markdown: [
      '# Callout Tour',
      '',
      '> [!note] Product note',
      '> This [[sample]] shows how ==callouts== feel inside normal reading flow.',
      '',
      '> [!tip]+ Expanded foldable',
      '> This one starts expanded so the stage feels full immediately.',
      '',
      '> [!warning]- Collapsed foldable',
      '> This one starts collapsed to show the contrast.',
      '',
      '> [!question] Outer callout',
      '> Outer context paragraph.',
      '>',
      '> > [!example] Nested callout',
      '> > Inner content that still reads cleanly in the rendered stage.'
    ].join('\n')
  },
  {
    key: 'highlights',
    title: 'Highlights',
    markdown: [
      '# Editorial Notes',
      '',
      'A reading-oriented demo should show ==inline emphasis== in realistic paragraphs.',
      '',
      'When the rest of the page is calm, ==highlighted text== feels intentional rather than noisy.',
      '',
      'You can still mix it with normal markdown like ==**strong text**==, and links to ==[[Project Notes]]==.',
    ].join('\n')
  },
  {
    key: 'comments',
    title: 'Comments',
    markdown: [
      '# Review Notes',
      '',
      'This sentence stays visible. %%This internal note should only appear in the editor drawer.%%',
      '',
      'You can use comments to keep authoring context without cluttering the published reading view.',
      '',
      'The contrast becomes obvious once the editor overlay is open.'
    ].join('\n')
  }
]

export const defaultDemoSampleKey: DemoSampleKey = 'wikilinks'

const demoSamplesByKey = new Map(demoSamples.map((sample) => [sample.key, sample]))

export function getDemoSample(key: DemoSampleKey): DemoSample {
  return demoSamplesByKey.get(key) ?? demoSamples[0]!
}

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
      'This heading is the destination for [[Page#Heading]].',
      '',
      'This paragraph is the destination for [[Page#^block-id]]. ^block-id',
      '',
      '## Related notes',
      '',
      'Continue with [[Project Notes#Overview]] or jump to [[Roadmap#^next-step]].'
    ].join('\n')
  },
  {
    path: 'Project Notes',
    title: 'Project Notes',
    summary: 'A richer note for the mixed showcase example, including nested heading targets and cross-note links.',
    markdown: [
      '# Project Notes',
      '',
      'A working note for the demo knowledge base.',
      '',
      '## Overview',
      '',
      'This section is the destination for [[Project Notes#Overview]] in the mixed showcase example.',
      '',
      'The demo keeps OFM parsing inside `react-markdown`, then routes wikilinks into the in-app wiki.',
      '',
      '### Detail',
      '',
      'This nested heading is the destination for [[Project Notes#Overview#Detail]] and `![[Project Notes#Overview#Detail]]`.',
      '',
      'Repeated `#` stays part of the fragment string instead of creating a second target field.',
      '',
      '## Navigation',
      '',
      '- Review the main reference page: [[Page#Heading]]',
      '- See the current implementation sequence: [[Roadmap#^next-step]]',
      '- Open a nested path example: [[Folder Name/Page Name#Heading Here]]',
      '- Compare heading navigation with the block target on the roadmap note.'
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
  },
  {
    path: 'Recursive Embed',
    title: 'Recursive Embed',
    summary: 'Self-embedding note used to verify recursive note embeds fall back to links in the demo.',
    markdown: [
      '# Recursive Embed',
      '',
      'This page intentionally embeds itself.',
      '',
      '![[Recursive Embed]]'
    ].join('\n')
  },
  {
    path: 'Depth One',
    title: 'Depth One',
    summary: 'Starts a note-embed chain that eventually trips the demo depth guard.',
    markdown: [
      '# Depth One',
      '',
      'First level of the nested embed chain.',
      '',
      '![[Depth Two]]'
    ].join('\n')
  },
  {
    path: 'Depth Two',
    title: 'Depth Two',
    summary: 'Second level of the nested embed chain; its child should fall back to a link.',
    markdown: [
      '# Depth Two',
      '',
      'Second level of the nested embed chain.',
      '',
      '![[Depth Three]]'
    ].join('\n')
  },
  {
    path: 'Depth Three',
    title: 'Depth Three',
    summary: 'Only reachable when the embed depth guard is relaxed.',
    markdown: [
      '# Depth Three',
      '',
      'This note should only appear as a fallback link with the default guard settings.'
    ].join('\n')
  },
  {
    path: 'Deep/Nested/Page',
    title: 'Page',
    summary: 'Nested route example used by the showcase wikilink sample.',
    markdown: [
      '# Deep/Nested/Page',
      '',
      'This page proves that nested wiki routes work in the demo preview.'
    ].join('\n')
  }
]

const demoWikiPagesByPath = new Map(demoWikiPages.map((page) => [page.path, page]))

export function getDemoWikiPage(path: string): DemoWikiPage | undefined {
  return demoWikiPagesByPath.get(normalizeDemoWikiPath(path))
}

export function normalizeDemoWikiPath(path: string): string {
  return normalizeOfmPath(path)
}

export function buildDemoWikiHref(path: string, fragment?: string): string {
  const normalizedPath = normalizeDemoWikiPath(path)
  const normalizedFragment = fragment ? decodeOfmFragment(fragment) : ''

  return buildOfmTargetUrl(
    {
      path: normalizedPath,
      ...(normalizedFragment.length === 0 ? {} : {fragment: normalizedFragment})
    },
    'wiki'
  )
}
