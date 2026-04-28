import {buildWikiHref} from '../wiki/wiki.js'

export type DemoSampleKey =
  | 'wikilinks'
  | 'embeds'
  | 'external-embeds'
  | 'callouts'
  | 'highlights'
  | 'comments'

export interface DemoSample {
  description: string
  featureSummary: string[]
  key: DemoSampleKey
  markdown: string
  title: string
}

export const demoSamples: DemoSample[] = [
  {
    key: 'wikilinks',
    title: 'Wikilinks',
    description: 'Alias links, nested paths, and anchor targets in a page-like note.',
    featureSummary: ['Wikilinks', 'Aliases', 'Fragments'],
    markdown: [
      '# Research Hub',
      '',
      'Start with [[Project Notes|the main project note]] and then jump into [[Deep/Nested/Page]].',
      '',
      '## Reading list',
      '',
      '- [[Roadmap]]',
      '- [[Project Notes#Overview]]',
      '- [[Roadmap#^next-step|Next milestone block]]',
      '',
      'This sample is meant to read like a real note, not a syntax checklist.'
    ].join('\n')
  },
  {
    key: 'embeds',
    title: 'Embeds',
    description: 'Image, note, section, and block embeds shown in one visually rich page.',
    featureSummary: ['Image embed', 'Note embed', 'Section embed'],
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
      '## Embedded block',
      '',
      '![[Roadmap#^next-step]]'
    ].join('\n')
  },
  {
    key: 'external-embeds',
    title: 'External Embeds',
    description: 'Plain markdown image syntax upgraded into YouTube and X embeds in the preview pane.',
    featureSummary: ['YouTube', 'X/Twitter', 'Rehype transform'],
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
    description: 'Structured callout blocks with readable hierarchy and foldable states.',
    featureSummary: ['Callouts', 'Foldable', 'Nested blocks'],
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
    description: 'Inline highlighting inside prose so the result feels editorial rather than synthetic.',
    featureSummary: ['Highlights', 'Prose layout'],
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
    description: 'Source-only comments that disappear from the rendered page but remain visible in the editor.',
    featureSummary: ['Comments', 'Source vs preview'],
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

export function getDemoSample(key: DemoSampleKey): DemoSample {
  const sample = demoSamples.find((entry) => entry.key === key)

  if (sample) {
    return sample
  }

  return demoSamples[0]!
}

export const demoWikiEntryHref = buildWikiHref('Project Notes')
