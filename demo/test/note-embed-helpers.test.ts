import {describe, expect, test} from 'vitest'

import {
  guardOfmNoteEmbed,
  resolveOfmNoteEmbedContent
} from '../src/features/markdown/note-embed.js'

describe('demo note embed helpers', () => {
  test('resolves whole-document embeds and strips the root heading by default', () => {
    const markdown = [
      '# Project Notes',
      '',
      'Intro paragraph.',
      '',
      '## Overview',
      '',
      'Overview content.'
    ].join('\n')

    expect(resolveOfmNoteEmbedContent({markdown})).toEqual({
      kind: 'document',
      markdown: [
        'Intro paragraph.',
        '',
        '## Overview',
        '',
        'Overview content.'
      ].join('\n')
    })
  })

  test('can preserve the root heading when requested', () => {
    const markdown = [
      '# Project Notes',
      '',
      'Intro paragraph.'
    ].join('\n')

    expect(resolveOfmNoteEmbedContent({markdown, stripRootHeading: false})).toEqual({
      kind: 'document',
      markdown
    })
  })

  test('extracts heading and block targets and falls back when they are missing', () => {
    const headingMarkdown = [
      '# Project Notes',
      '',
      'Intro paragraph.',
      '',
      '## Overview',
      '',
      'Overview content.',
      '',
      '### Detail',
      '',
      'Nested content.',
      '',
      '## Navigation',
      '',
      'Navigation content.'
    ].join('\n')

    expect(resolveOfmNoteEmbedContent({
      markdown: headingMarkdown,
      permalink: 'Project Notes#  overview  '
    })).toEqual({
      fragment: '  overview  ',
      kind: 'heading',
      markdown: [
        '## Overview',
        '',
        'Overview content.',
        '',
        '### Detail',
        '',
        'Nested content.'
      ].join('\n')
    })

    expect(resolveOfmNoteEmbedContent({
      markdown: headingMarkdown,
      permalink: 'Project Notes#Overview%20'
    })).toEqual({
      fragment: 'Overview ',
      kind: 'heading',
      markdown: [
        '## Overview',
        '',
        'Overview content.',
        '',
        '### Detail',
        '',
        'Nested content.'
      ].join('\n')
    })

    const blockMarkdown = [
      '# Roadmap',
      '',
      'Finish the current milestone. ^next-step',
      '',
      'Follow-up paragraph.'
    ].join('\n')

    expect(resolveOfmNoteEmbedContent({
      markdown: blockMarkdown,
      permalink: 'Roadmap#^next-step'
    })).toEqual({
      fragment: '^next-step',
      kind: 'block',
      markdown: 'Finish the current milestone. ^next-step'
    })

    expect(resolveOfmNoteEmbedContent({
      markdown: headingMarkdown,
      permalink: 'Project Notes#Missing Heading'
    })).toEqual({
      fragment: 'Missing Heading',
      kind: 'document',
      markdown: [
        'Intro paragraph.',
        '',
        '## Overview',
        '',
        'Overview content.',
        '',
        '### Detail',
        '',
        'Nested content.',
        '',
        '## Navigation',
        '',
        'Navigation content.'
      ].join('\n')
    })
  })

  test('guards only by depth while advancing state', () => {
    expect(guardOfmNoteEmbed({
      state: {
        depth: 0
      }
    })).toEqual({
      allowRender: true,
      isTooDeep: false,
      nextState: {
        depth: 1
      }
    })

    expect(guardOfmNoteEmbed({
      state: {
        depth: 1
      }
    })).toEqual({
      allowRender: true,
      isTooDeep: false,
      nextState: {
        depth: 2
      }
    })

    expect(guardOfmNoteEmbed({
      maxDepth: 2,
      state: {
        depth: 2
      }
    })).toEqual({
      allowRender: false,
      isTooDeep: true,
      nextState: {
        depth: 3
      }
    })
  })
})
