export interface DemoExample {
  description: string
  name: string
  value: string
}

export const demoExamples: DemoExample[] = [
  {
    name: 'Mixed showcase',
    description: 'Feature overview focused on wikilinks, highlights, and block targets',
    value: [
      '# remark-ofm + react-markdown',
      '',
      'Visit [[Project Notes|the project note]] for more detail.',
      '',
      'This sentence contains ==highlighted text==.',
      '',
      '- Another wikilink: [[Roadmap#^next-step]]',
      '',
      'You can also use **regular markdown** and `code blocks` together with OFM features.'
    ].join('\n')
  },
  {
    name: 'Basic wikilink',
    description: 'Shows how react-markdown renders a simple [[Page]] wikilink through the remark plugin.',
    value: '[[Page]]\n'
  },
  {
    name: 'Wikilink heading',
    description: 'Shows a wikilink that targets a heading.',
    value: '[[Page#Heading]]\n'
  },
  {
    name: 'Wikilink block ref',
    description: 'Shows a wikilink with an Obsidian block reference target.',
    value: '[[Page#^block-id]]\n'
  },
  {
    name: 'Wikilink alias',
    description: 'Shows a wikilink with an alias label.',
    value: '[[Page|Alias]]\n'
  },
  {
    name: 'Highlight',
    description: 'Shows ==highlight== rendered through react-markdown.',
    value: '==highlight==\n'
  }
]
