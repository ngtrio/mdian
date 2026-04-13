export interface DemoExample {
  description: string
  name: string
  value: string
}

export const demoExamples: DemoExample[] = [
  {
    name: 'Mixed showcase',
    description: 'A compact react-markdown example covering the currently implemented OFM syntax in one document.',
    value: [
      '# remark-ofm + react-markdown',
      '',
      'Visit [[Project Notes|the project note]] for more detail.',
      '',
      'Embed the summary here: ![[Project Notes#Overview]]',
      '',
      'This sentence contains ==highlighted text==.',
      '',
      '- Another wikilink: [[Roadmap#^next-step]]'
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
    name: 'Basic embed',
    description: 'Shows a simple ![[Page]] embed rendered with demo metadata.',
    value: '![[Page]]\n'
  },
  {
    name: 'Embed heading',
    description: 'Shows an embed that targets a heading.',
    value: '![[Page#Heading]]\n'
  },
  {
    name: 'Embed block ref',
    description: 'Shows an embed with an Obsidian block reference target.',
    value: '![[Page#^block-id]]\n'
  },
  {
    name: 'Highlight',
    description: 'Shows ==highlight== rendered through react-markdown.',
    value: '==highlight==\n'
  }
]
