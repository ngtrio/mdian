import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import type { Element } from 'hast'

import remarkParse from 'remark-parse'
import { unified } from 'unified'

import {
  buildOfmTargetUrl,
  decodeOfmFragment,
  findOfmAnchorTarget,
  getOfmAnchorKeyFromHash,
  normalizeOfmPath,
  ofmClassNames,
  remarkOfm,
  type OfmRemarkOptions
} from '../src/index.js'
import { anchorHast, normalizeOfmAnchorKey } from '../src/lib/anchor/hast.js'
import { embedHast } from '../src/lib/embed/hast.js'
import { highlightHast } from '../src/lib/highlight/hast.js'
import {getOfmNodeData, stripOfmDataProps} from '../src/lib/ofm-node.js'
import { wikiLinkHast } from '../src/lib/wikilink/hast.js'

interface FixtureConfig {
  options?: OfmRemarkOptions
}

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const fixturesDir = path.join(repoRoot, 'test', 'fixtures')
const fixtures = (await readdir(fixturesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

for (const fixtureName of fixtures) {
  test(fixtureName, async () => {
    const fixtureDir = path.join(fixtureDirBase(fixtureName), '')
    const [input, expectedTree, config] = await Promise.all([
      readUtf8(path.join(fixtureDir, 'input.md')),
      readJson(path.join(fixtureDir, 'tree.json')),
      readOptionalJson(path.join(fixtureDir, 'config.json')) as Promise<FixtureConfig | undefined>
    ])

    const processor = unified()
      .use(remarkParse)
      .use(remarkOfm, config?.options ?? {})

    assert.deepEqual(stripPositions(processor.parse(input)), expectedTree)
  })
}

test('wikiLinkHast uses root-path default when hrefPrefix is omitted', () => {
  const node = createWikiLinkElement({
    value: 'Project Notes',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })

  wikiLinkHast()(node)

  assert.equal(node.properties.href, '/Project%20Notes')
  assert.equal(node.properties.title, 'Project Notes')
  assertClassNames(node, [ofmClassNames.wikilink])
  assert.equal(node.properties.dataOfmKind, undefined)
  assert.equal(node.properties['data-ofm-kind'], undefined)
})

test('wikiLinkHast uses hrefPrefix path plus fragment when provided', () => {
  const node = createWikiLinkElement({
    value: 'Page#Heading',
    path: 'Page',
    permalink: 'Page#Heading'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/Page#Heading')
  assert.equal(node.properties.title, 'Page#Heading')
})

test('wikiLinkHast resolves aliases using permalink rather than alias text', () => {
  const node = createWikiLinkElement({
    value: 'Page|Alias',
    path: 'Page',
    permalink: 'Page',
    alias: 'Alias'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/Page')
  assert.equal(node.properties.title, 'Page')
})

test('wikiLinkHast preserves block fragments with hrefPrefix', () => {
  const node = createWikiLinkElement({
    value: 'Page#^block-id',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/Page#^block-id')
  assert.equal(node.properties.title, 'Page#^block-id')
})

test('wikiLinkHast encodes path segments but preserves fragments with hrefPrefix', () => {
  const node = createWikiLinkElement({
    value: 'Folder Name/Page Name#Heading Here',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/Folder%20Name/Page%20Name#Heading Here')
  assert.equal(node.properties.title, 'Folder Name/Page Name#Heading Here')
})

test('wikiLinkHast can skip title assignment', () => {
  const node = createWikiLinkElement({
    value: 'Page',
    path: 'Page',
    permalink: 'Page'
  })

  wikiLinkHast({ hrefPrefix: 'notes', setTitle: false })(node)

  assert.equal(node.properties.href, '/notes/Page')
  assert.equal(node.properties.title, undefined)
})

test('embedHast renders extensionless note embeds as semantic containers', () => {
  const node = createEmbedElement({
    value: 'Project Notes',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })

  embedHast()(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties['data-ofm-embed'], 'note')
  assert.equal(node.properties['data-ofm-path-public'], 'Project Notes')
  assert.equal(node.properties['data-ofm-permalink-public'], 'Project Notes')
  assert.equal(node.properties.title, 'Project Notes')
  assertClassNames(node, [ofmClassNames.embed])
  assert.equal(node.properties.dataOfmKind, undefined)
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/Project%20Notes'},
    children: [{type: 'text', value: 'Project Notes'}]
  }])
})

test('embedHast renders markdown file embeds as semantic containers with fragments', () => {
  const node = createEmbedElement({
    value: 'Page.md#Heading',
    path: 'Page.md',
    permalink: 'Page.md#Heading'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties['data-ofm-embed'], 'note')
  assert.equal(node.properties['data-ofm-path-public'], 'Page.md')
  assert.equal(node.properties['data-ofm-permalink-public'], 'Page.md#Heading')
  assert.equal(node.properties.title, 'Page.md#Heading')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/Page.md#Heading'},
    children: [{type: 'text', value: 'Page.md#Heading'}]
  }])
})

test('embedHast renders image embeds as images', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png',
    path: 'assets/cover.png',
    permalink: 'assets/cover.png'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/notes/assets/cover.png')
  assert.equal(node.properties.alt, 'assets/cover.png')
  assert.equal(node.properties.title, 'assets/cover.png')
})

test('embedHast renders non-image files as links', () => {
  const node = createEmbedElement({
    value: 'manual.pdf',
    path: 'manual.pdf',
    permalink: 'manual.pdf'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'a')
  assert.equal(node.properties.href, '/notes/manual.pdf')
  assert.equal(node.properties.title, 'manual.pdf')
  assert.deepEqual(node.children, [{type: 'text', value: 'manual.pdf'}])
})

test('embedHast uses permalink rather than alias text for note embed title', () => {
  const node = createEmbedElement({
    value: 'Page|Alias',
    path: 'Page',
    permalink: 'Page',
    alias: 'Alias'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Page')
  assert.equal(node.properties['data-ofm-alias-public'], 'Alias')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/Page'},
    children: [{type: 'text', value: 'Alias'}]
  }])
})

test('embedHast preserves block fragments with hrefPrefix for note embeds', () => {
  const node = createEmbedElement({
    value: 'Page#^block-id',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties['data-ofm-block-id-public'], 'block-id')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/Page#^block-id'},
    children: [{type: 'text', value: 'Page#^block-id'}]
  }])
  assert.equal(node.properties.title, 'Page#^block-id')
})

test('embedHast encodes path segments but preserves fragments with hrefPrefix', () => {
  const node = createEmbedElement({
    value: 'Folder Name/Page Name#Heading Here',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties['data-ofm-path-public'], 'Folder Name/Page Name')
  assert.equal(node.properties.title, 'Folder Name/Page Name#Heading Here')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/Folder%20Name/Page%20Name#Heading Here'},
    children: [{type: 'text', value: 'Folder Name/Page Name#Heading Here'}]
  }])
})

test('embedHast can skip title assignment', () => {
  const node = createEmbedElement({
    value: 'Page',
    path: 'Page',
    permalink: 'Page'
  })

  embedHast({ hrefPrefix: 'notes', setTitle: false })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, undefined)
})

test('normalizeOfmAnchorKey decodes fragments and collapses whitespace', () => {
  assert.equal(normalizeOfmAnchorKey('#Heading%20Here'), 'heading here')
  assert.equal(normalizeOfmAnchorKey('  ^Block-ID  '), '^block-id')
})

test('getOfmAnchorKeyFromHash matches anchor normalization behavior', () => {
  assert.equal(getOfmAnchorKeyFromHash('#Heading%20Here'), 'heading here')
  assert.equal(getOfmAnchorKeyFromHash('#^Block-ID'), '^block-id')
})

test('findOfmAnchorTarget locates the first matching data-anchor-key', () => {
  const alpha = {dataset: {anchorKey: 'alpha'}}
  const headingHere = {dataset: {anchorKey: 'heading here'}}
  const root = {
    querySelectorAll() {
      return [alpha, headingHere]
    }
  }

  assert.equal(findOfmAnchorTarget(root, '#Heading%20Here'), headingHere)
  assert.equal(findOfmAnchorTarget(root, '#missing'), undefined)
})

test('anchorHast adds data-anchor-key to headings', () => {
  const node: Element = {
    type: 'element',
    tagName: 'h2',
    properties: {},
    children: [
      {type: 'text', value: 'Heading '},
      {
        type: 'element',
        tagName: 'strong',
        properties: {},
        children: [{type: 'text', value: 'Here'}]
      }
    ]
  }

  anchorHast()(node)

  assert.equal(node.properties['data-anchor-key'], 'heading here')
  assertClassNames(node, [ofmClassNames.anchorTarget, ofmClassNames.headingTarget])
})

test('anchorHast extracts trailing block refs into element properties', () => {
  const node: Element = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [{type: 'text', value: 'Paragraph target. ^block-id'}]
  }

  anchorHast()(node)

  assert.equal(node.properties['data-anchor-key'], '^block-id')
  assertClassNames(node, [ofmClassNames.anchorTarget, ofmClassNames.blockTarget])
  assert.deepEqual(node.children, [{type: 'text', value: 'Paragraph target.'}])
})

test('anchorHast can append a styled block anchor label when enabled', () => {
  const node: Element = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [{type: 'text', value: 'Paragraph target. ^block-id'}]
  }

  anchorHast({renderBlockAnchorLabels: true})(node)

  assert.equal(node.properties['data-anchor-key'], '^block-id')
  assertClassNames(node, [ofmClassNames.anchorTarget, ofmClassNames.blockTarget])
  assert.deepEqual(node.children, [
    {type: 'text', value: 'Paragraph target.'},
    {
      type: 'element',
      tagName: 'span',
      properties: {
        className: [ofmClassNames.blockAnchorLabel]
      },
      children: [{type: 'text', value: '^block-id'}]
    }
  ])
})

test('highlightHast removes OFM metadata after rendering intent is consumed', () => {
  const node: Element = {
    type: 'element',
    tagName: 'mark',
    properties: {
      dataOfmKind: 'highlight',
      'data-ofm-kind': 'highlight'
    },
    children: [{type: 'text', value: 'highlighted'}]
  }

  highlightHast()(node)

  assertClassNames(node, [ofmClassNames.highlight])
  assert.equal(node.properties.dataOfmKind, undefined)
  assert.equal(node.properties['data-ofm-kind'], undefined)
})

test('wikilink and anchor transforms preserve existing class names', () => {
  const node = createWikiLinkElement({
    value: 'Page',
    path: 'Page',
    permalink: 'Page'
  })

  node.properties.className = ['existing-link']
  wikiLinkHast()(node)

  assertClassNames(node, ['existing-link', ofmClassNames.wikilink])
})

test('anchorHast preserves existing class names on block targets', () => {
  const node: Element = {
    type: 'element',
    tagName: 'li',
    properties: {
      className: ['existing-item']
    },
    children: [{type: 'text', value: 'List target. ^block-id'}]
  }

  anchorHast()(node)

  assertClassNames(node, ['existing-item', ofmClassNames.anchorTarget, ofmClassNames.blockTarget])
})

test('anchorHast leaves non-target paragraphs unchanged', () => {
  const node: Element = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [{type: 'text', value: 'Plain paragraph'}]
  }

  anchorHast()(node)

  assert.deepEqual(node, {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [{type: 'text', value: 'Plain paragraph'}]
  })
})

test('getOfmNodeData reads wikilink metadata from hast properties', () => {
  const node = createWikiLinkElement({
    value: 'Folder Name/Page Name#Heading Here|Alias',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here',
    alias: 'Alias'
  })

  assert.deepEqual(getOfmNodeData(node.properties), {
    kind: 'wikilink',
    value: 'Folder Name/Page Name#Heading Here|Alias',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here',
    alias: 'Alias'
  })
})

test('getOfmNodeData reads embed metadata including block refs', () => {
  const node = createEmbedElement({
    value: 'Page#^block-id',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id'
  })

  assert.deepEqual(getOfmNodeData(node.properties), {
    kind: 'embed',
    value: 'Page#^block-id',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id'
  })
})

test('getOfmNodeData recognizes highlight nodes and ignores plain elements', () => {
  assert.deepEqual(getOfmNodeData({dataOfmKind: 'highlight'}), {kind: 'highlight'})
  assert.equal(getOfmNodeData({}), undefined)
})

test('stripOfmDataProps removes internal ofm markers but preserves normal props', () => {
  assert.deepEqual(
    stripOfmDataProps({
      dataOfmAlias: 'Alias',
      dataOfmBlockId: 'block-id',
      dataOfmKind: 'embed',
      dataOfmPath: 'Page',
      dataOfmPermalink: 'Page#Heading',
      dataOfmValue: 'Page#Heading',
      'data-anchor-key': 'heading',
      'data-ofm-alias': 'Alias',
      'data-ofm-block-id': 'block-id',
      'data-ofm-kind': 'embed',
      'data-ofm-path': 'Page',
      'data-ofm-permalink': 'Page#Heading',
      'data-ofm-value': 'Page#Heading',
      alt: 'example',
      className: 'embed-card'
    }),
    {
      alt: 'example',
      className: 'embed-card'
    }
  )
})

test('normalizeOfmPath decodes segments, trims whitespace, and drops empties', () => {
  assert.equal(normalizeOfmPath(' Folder%20Name / Page%20Name '), 'Folder Name/Page Name')
  assert.equal(normalizeOfmPath('Section//Nested%2FPage'), 'Section/Nested/Page')
  assert.equal(normalizeOfmPath('Bad%ZZ/Path'), 'Bad%ZZ/Path')
})

test('decodeOfmFragment safely decodes hashes without lowercasing them', () => {
  assert.equal(decodeOfmFragment('#Heading%20Here'), 'Heading Here')
  assert.equal(decodeOfmFragment('^Block-ID'), '^Block-ID')
  assert.equal(decodeOfmFragment('Bad%ZZ'), 'Bad%ZZ')
})

test('buildOfmTargetUrl normalizes paths and preserves heading or block fragments', () => {
  assert.equal(
    buildOfmTargetUrl(
      {
        path: ' Folder%20Name / Page%20Name ',
        permalink: 'Folder Name/Page Name#Heading Here'
      },
      'wiki'
    ),
    '/wiki/Folder%20Name/Page%20Name#Heading Here'
  )

  assert.equal(
    buildOfmTargetUrl(
      {
        path: 'Page',
        permalink: 'Page#^block-id',
        blockId: 'block-id'
      },
      'wiki'
    ),
    '/wiki/Page#^block-id'
  )
})

function fixtureDirBase(fixtureName: string): string {
  return path.join(fixturesDir, fixtureName)
}

async function readUtf8(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8')
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readUtf8(filePath))
}

async function readOptionalJson(filePath: string): Promise<unknown | undefined> {
  try {
    await access(filePath)
    return readJson(filePath)
  } catch {
    return undefined
  }
}

function stripPositions(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripPositions(entry))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const cleaned: Record<string, unknown> = {}

  for (const [key, entry] of Object.entries(value)) {
    if (key !== 'position') {
      cleaned[key] = stripPositions(entry)
    }
  }

  return cleaned
}

function createWikiLinkElement({
  value,
  path,
  permalink,
  alias,
  blockId
}: {
  value: string
  path: string
  permalink: string
  alias?: string
  blockId?: string
}): Element {
  return createOfmElement('wikilink', 'a', {
    value,
    path,
    permalink,
    ...(alias === undefined ? {} : { alias }),
    ...(blockId === undefined ? {} : { blockId })
  })
}

function createEmbedElement({
  value,
  path,
  permalink,
  alias,
  blockId
}: {
  value: string
  path: string
  permalink: string
  alias?: string
  blockId?: string
}): Element {
  return createOfmElement('embed', 'span', {
    value,
    path,
    permalink,
    ...(alias === undefined ? {} : { alias }),
    ...(blockId === undefined ? {} : { blockId })
  })
}

function assertClassNames(node: Element, expected: string[]): void {
  assert.deepEqual(node.properties.className, expected)
}

function createOfmElement(
  kind: 'wikilink' | 'embed',
  tagName: string,
  {
    value,
    path,
    permalink,
    alias,
    blockId
  }: {
    value: string
    path: string
    permalink: string
    alias?: string
    blockId?: string
  }
): Element {
  return {
    type: 'element',
    tagName,
    properties: {
      dataOfmKind: kind,
      dataOfmValue: value,
      dataOfmPath: path,
      dataOfmPermalink: permalink,
      dataOfmAlias: alias ?? '',
      dataOfmBlockId: blockId ?? ''
    },
    children: []
  }
}
