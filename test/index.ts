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
  remarkOfm,
  type OfmRemarkOptions
} from '../src/index.js'
import { anchorHast, normalizeOfmAnchorKey } from '../src/lib/anchor/hast.js'
import { embedHast } from '../src/lib/embed/hast.js'
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

test('embedHast uses root-path default when hrefPrefix is omitted', () => {
  const node = createEmbedElement({
    value: 'Project Notes',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })

  embedHast()(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/Project%20Notes')
  assert.equal(node.properties.alt, 'Project Notes')
  assert.equal(node.properties.title, 'Project Notes')
  assert.deepEqual(node.children, [])
})

test('embedHast uses hrefPrefix path plus fragment when provided', () => {
  const node = createEmbedElement({
    value: 'Page#Heading',
    path: 'Page',
    permalink: 'Page#Heading'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/notes/Page#Heading')
  assert.equal(node.properties.alt, 'Page#Heading')
  assert.equal(node.properties.title, 'Page#Heading')
})

test('embedHast resolves aliases using permalink rather than alias text', () => {
  const node = createEmbedElement({
    value: 'Page|Alias',
    path: 'Page',
    permalink: 'Page',
    alias: 'Alias'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.src, '/notes/Page')
  assert.equal(node.properties.alt, 'Page|Alias')
  assert.equal(node.properties.title, 'Page')
})

test('embedHast preserves block fragments with hrefPrefix', () => {
  const node = createEmbedElement({
    value: 'Page#^block-id',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.src, '/notes/Page#^block-id')
  assert.equal(node.properties.alt, 'Page#^block-id')
  assert.equal(node.properties.title, 'Page#^block-id')
})

test('embedHast encodes path segments but preserves fragments with hrefPrefix', () => {
  const node = createEmbedElement({
    value: 'Folder Name/Page Name#Heading Here',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.src, '/notes/Folder%20Name/Page%20Name#Heading Here')
  assert.equal(node.properties.alt, 'Folder Name/Page Name#Heading Here')
  assert.equal(node.properties.title, 'Folder Name/Page Name#Heading Here')
})

test('embedHast can skip title assignment', () => {
  const node = createEmbedElement({
    value: 'Page',
    path: 'Page',
    permalink: 'Page'
  })

  embedHast({ hrefPrefix: 'notes', setTitle: false })(node)

  assert.equal(node.properties.src, '/notes/Page')
  assert.equal(node.properties.title, undefined)
})

test('embedHast lets resolveEmbed override the shared default URL', () => {
  const node = createEmbedElement({
    value: 'Page',
    path: 'Page',
    permalink: 'Page'
  })

  embedHast({
    hrefPrefix: 'notes',
    resolveEmbed: () => 'https://cdn.example.com/page.png'
  })(node)

  assert.equal(node.properties.src, 'https://cdn.example.com/page.png')
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
  assert.equal(node.properties.dataOfmBlockId, 'block-id')
  assert.deepEqual(node.children, [{type: 'text', value: 'Paragraph target.'}])
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
