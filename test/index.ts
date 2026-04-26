import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import type { Element, Root } from 'hast'

import remarkParse from 'remark-parse'
import { unified } from 'unified'

import {
  buildOfmTargetUrl,
  decodeOfmFragment,
  findOfmAnchorTarget,
  getOfmAnchorKeyFromHash,
  normalizeOfmPath,
  ofmClassNames,
  rehypeOfm,
  remarkOfm,
  type OfmRemarkOptions
} from '../src/index.js'
import {createOfmComponents, createOfmReactMarkdown} from '../src/react-markdown/index.js'
import { anchorHast, normalizeOfmAnchorKey } from '../src/lib/anchor/hast.js'
import { calloutHast } from '../src/lib/callout/hast.js'
import { embedHast } from '../src/lib/embed/hast.js'
import { highlightHast } from '../src/lib/highlight/hast.js'
import {getOfmNodeData, stripOfmDataProps} from '../src/lib/shared/ofm-node.js'
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

    const tree = await processor.run(processor.parse(input))
    assert.deepEqual(stripPositions(tree), expectedTree)
  })
}

test('createOfmReactMarkdown returns react-markdown adapter plugins', () => {
  const adapter = createOfmReactMarkdown({
    ofm: {
      callouts: false,
      comments: true,
      hrefPrefix: 'wiki',
      renderBlockAnchorLabels: true,
      setTitle: true
    }
  })

  assert.deepEqual(adapter.remarkPlugin, [remarkOfm, {callouts: false, comments: true}])
  assert.deepEqual(adapter.rehypePlugin, [rehypeOfm, {
    hrefPrefix: 'wiki',
    renderBlockAnchorLabels: true,
    setTitle: true
  }])
  assert.equal(adapter.components, undefined)
})

test('createOfmReactMarkdown can include the default OFM-aware components map', () => {
  const adapter = createOfmReactMarkdown({components: {}})

  assert.equal(typeof adapter.components?.a, 'function')
  assert.equal(typeof adapter.components?.div, 'function')
})

test('createOfmComponents exposes the OFM element overrides used by react-markdown', () => {
  const components = createOfmComponents()

  assert.equal(typeof components.a, 'function')
  assert.equal(typeof components.div, 'function')
})

test('build emits the public styles entrypoint', async () => {
  await access(path.join(repoRoot, 'dist', 'styles.css'))
})

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
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })
  assert.equal(node.properties.dataOfmKind, undefined)
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
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    permalink: 'Page#Heading',
    fragment: 'Heading'
  })
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
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    permalink: 'Page',
    alias: 'Alias'
  })
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
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id',
    fragment: '^block-id'
  })
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
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here',
    fragment: 'Heading Here'
  })
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

test('calloutHast renders foldable callouts as details with open state metadata', () => {
  const node = createCalloutElement({
    calloutType: 'note',
    title: 'Callout title',
    foldable: true,
    collapsed: false,
    children: [{type: 'element', tagName: 'p', properties: {}, children: [{type: 'text', value: 'Callout body'}]}]
  })

  calloutHast()(node)

  assert.equal(node.tagName, 'details')
  assertOfmPublicProps(node, {kind: 'callout'})
  assert.equal(node.properties['data-ofm-callout'], 'note')
  assert.equal(node.properties['data-ofm-foldable'], '')
  assert.equal(node.properties['data-ofm-collapsed'], undefined)
  assert.equal(node.properties.open, true)
  assertClassNames(node, [ofmClassNames.callout])
  assert.deepEqual(node.children, [
    {
      type: 'element',
      tagName: 'summary',
      properties: {className: [ofmClassNames.calloutTitle]},
      children: [{type: 'text', value: 'Callout title'}]
    },
    {
      type: 'element',
      tagName: 'div',
      properties: {className: [ofmClassNames.calloutContent]},
      children: [{type: 'element', tagName: 'p', properties: {}, children: [{type: 'text', value: 'Callout body'}]}]
    }
  ])
})

test('calloutHast keeps collapsed metadata and nested callouts inside content', () => {
  const nested = createCalloutElement({
    calloutType: 'tip',
    title: 'Inner title',
    foldable: false,
    collapsed: false,
    children: [{type: 'element', tagName: 'p', properties: {}, children: [{type: 'text', value: 'Inner body'}]}]
  })
  const node = createCalloutElement({
    calloutType: 'warning',
    title: 'Outer title',
    foldable: true,
    collapsed: true,
    children: [nested]
  })

  calloutHast()(node)

  assert.equal(node.tagName, 'details')
  assertOfmPublicProps(node, {kind: 'callout'})
  assert.equal(node.properties['data-ofm-callout'], 'warning')
  assert.equal(node.properties['data-ofm-foldable'], '')
  assert.equal(node.properties['data-ofm-collapsed'], '')
  assert.equal(node.properties.open, undefined)
  assert.equal((node.children[0] as Element).tagName, 'summary')
  assert.deepEqual((node.children[1] as Element).children, [nested])
})

test('remarkOfm leaves callout syntax as blockquote when callouts are disabled', async () => {
  const input = '> [!note] Hidden\n> body'
  const processor = unified().use(remarkParse).use(remarkOfm, {callouts: false})

  const tree = await processor.run(processor.parse(input))

  assert.equal(tree.children[0]?.type, 'blockquote')
})

test('calloutHast renders an empty title container when the marker omits a title', () => {
  const node = createCalloutElement({
    calloutType: 'note',
    title: '',
    foldable: false,
    collapsed: false,
    children: [{type: 'element', tagName: 'p', properties: {}, children: [{type: 'text', value: 'Body'}]}]
  })

  calloutHast()(node)

  assert.deepEqual(node.children[0], {
    type: 'element',
    tagName: 'div',
    properties: {className: [ofmClassNames.calloutTitle]},
    children: []
  })
})

test('remarkOfm preserves multipart callout content as separate paragraphs', async () => {
  const input = '> [!note] Title\n>\n> first paragraph\n>\n> second paragraph'
  const processor = unified().use(remarkParse).use(remarkOfm)

  const tree = await processor.run(processor.parse(input))
  const callout = tree.children[0]

  assert.equal(callout?.type, 'callout')
  assert.deepEqual((callout?.children ?? []).map((child) => child.type), ['paragraph', 'paragraph'])
})

test('remarkOfm converts callouts when the first body paragraph contains wiki links', async () => {
  const input = '> [!warning] 交叉观察\n> 正文含 [[Alpha]] 和 [[Beta]]'
  const processor = unified().use(remarkParse).use(remarkOfm)

  const tree = await processor.run(processor.parse(input))
  const callout = tree.children[0]
  const body = callout?.type === 'callout' ? callout.children[0] : undefined

  assert.equal(callout?.type, 'callout')
  assert.equal(callout?.title, '交叉观察')
  assert.equal(body?.type, 'paragraph')
  assert.deepEqual((body?.children ?? []).map((child) => child.type), ['text', 'wikiLink', 'text', 'wikiLink'])
  assert.deepEqual(
    (body?.children ?? [])
      .filter((child) => child.type === 'wikiLink')
      .map((child) => ({path: child.path, permalink: child.permalink})),
    [
      {path: 'Alpha', permalink: 'Alpha'},
      {path: 'Beta', permalink: 'Beta'}
    ]
  )
})

test('remarkOfm converts callouts when the first body paragraph contains inline code nodes', async () => {
  const input = '> [!note] 基础说明\n> 正文含 `[[Code]]` 和 `[[More]]`'
  const processor = unified().use(remarkParse).use(remarkOfm)

  const tree = await processor.run(processor.parse(input))
  const callout = tree.children[0]
  const body = callout?.type === 'callout' ? callout.children[0] : undefined

  assert.equal(callout?.type, 'callout')
  assert.equal(callout?.title, '基础说明')
  assert.equal(body?.type, 'paragraph')
  assert.deepEqual((body?.children ?? []).map((child) => child.type), ['text', 'inlineCode', 'text', 'inlineCode'])
  assert.deepEqual(
    (body?.children ?? [])
      .filter((child) => child.type === 'inlineCode')
      .map((child) => child.value),
    ['[[Code]]', '[[More]]']
  )
})

test('remarkOfm preserves mixed inline body content before later callout paragraphs', async () => {
  const input = '> [!note] 基础说明\n> 第一段含 [[Alpha]] 和 `[[Code]]`\n>\n> 第二段文本'
  const processor = unified().use(remarkParse).use(remarkOfm)

  const tree = await processor.run(processor.parse(input))
  const callout = tree.children[0]
  const [firstParagraph, secondParagraph] = callout?.type === 'callout' ? callout.children : []

  assert.equal(callout?.type, 'callout')
  assert.deepEqual((callout?.children ?? []).map((child) => child.type), ['paragraph', 'paragraph'])
  assert.equal(firstParagraph?.type, 'paragraph')
  assert.deepEqual((firstParagraph?.children ?? []).map((child) => child.type), ['text', 'wikiLink', 'text', 'inlineCode'])
  assert.equal(secondParagraph?.type, 'paragraph')
  assert.deepEqual(stripPositions(secondParagraph?.children), [{type: 'text', value: '第二段文本'}])
})

test('remarkOfm still enables callout conversion without micromark callout extensions', async () => {
  const input = '> [!note] Title\n> Body'
  const processor = unified().use(remarkParse).use(remarkOfm)

  const tree = await processor.run(processor.parse(input))

  assert.equal(tree.children[0]?.type, 'callout')
})

test('calloutHast strips internal OFM properties after rendering', () => {
  const node = createCalloutElement({
    calloutType: 'warning',
    title: 'Heads up',
    foldable: true,
    collapsed: true,
    children: []
  })

  calloutHast()(node)

  assert.equal(node.properties.dataOfmKind, undefined)
  assert.equal(node.properties.dataOfmCalloutType, undefined)
  assert.equal(node.properties.dataOfmTitle, undefined)
  assertOfmPublicProps(node, {kind: 'callout'})
  assert.equal(node.properties['data-ofm-callout'], 'warning')
  assert.equal(node.properties['data-ofm-foldable'], '')
  assert.equal(node.properties['data-ofm-collapsed'], '')
})

test('getOfmNodeData reads callout metadata before hast cleanup', () => {
  const data = getOfmNodeData({
    dataOfmKind: 'callout',
    dataOfmCalloutType: 'tip',
    dataOfmTitle: 'Read me',
    dataOfmFoldable: true,
    dataOfmCollapsed: false
  })

  assert.deepEqual(data, {
    kind: 'callout',
    calloutType: 'tip',
    title: 'Read me',
    foldable: true,
    collapsed: false
  })
})

test('embedHast renders extensionless note embeds as semantic containers', () => {
  const node = createEmbedElement({
    value: 'Project Notes',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })

  embedHast()(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Project Notes')
  assertClassNames(node, [ofmClassNames.embed])
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes',
    permalink: 'Project Notes'
  })
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
  assert.equal(node.properties.title, 'Page.md#Heading')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page.md',
    permalink: 'Page.md#Heading',
    fragment: 'Heading'
  })
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
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'image',
    path: 'assets/cover.png',
    permalink: 'assets/cover.png'
  })
})

test('embedHast applies image width and height from embed size syntax', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png|100x145',
    path: 'assets/cover.png',
    permalink: 'assets/cover.png',
    size: { width: 100, height: 145 }
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.width, 100)
  assert.equal(node.properties.height, 145)
  assert.equal(node.properties.alt, 'assets/cover.png|100x145')
  assert.equal(node.properties['data-ofm-variant'], 'image')
})

test('embedHast applies image width when embed size syntax omits height', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png|100',
    path: 'assets/cover.png',
    permalink: 'assets/cover.png',
    size: { width: 100 }
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.width, 100)
  assert.equal(node.properties.height, undefined)
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
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'file',
    path: 'manual.pdf',
    permalink: 'manual.pdf'
  })
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
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page',
    permalink: 'Page',
    alias: 'Alias'
  })
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
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page',
    permalink: 'Page#^block-id',
    blockId: 'block-id',
    fragment: '^block-id'
  })
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
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Folder Name/Page Name',
    permalink: 'Folder Name/Page Name#Heading Here',
    fragment: 'Heading Here'
  })
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

test('rendering note embeds preserves fragment metadata and href output', () => {
  const node = createEmbedElement({
    value: 'Project Notes#Overview',
    path: 'Project Notes',
    permalink: 'Project Notes#Overview'
  })

  embedHast({ hrefPrefix: 'wiki', renderBlockAnchorLabels: true })(node)

  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes',
    permalink: 'Project Notes#Overview',
    fragment: 'Overview'
  })
  assert.equal(node.properties.title, 'Project Notes#Overview')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/wiki/Project%20Notes#Overview'},
    children: [{type: 'text', value: 'Project Notes#Overview'}]
  }])
})

test('rendering block embeds preserves fragment and block metadata', () => {
  const node = createEmbedElement({
    value: 'Roadmap#^next-step',
    path: 'Roadmap',
    permalink: 'Roadmap#^next-step',
    blockId: 'next-step'
  })

  embedHast({ hrefPrefix: 'wiki', renderBlockAnchorLabels: true })(node)

  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Roadmap',
    permalink: 'Roadmap#^next-step',
    blockId: 'next-step',
    fragment: '^next-step'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/wiki/Roadmap#^next-step'},
    children: [{type: 'text', value: 'Roadmap#^next-step'}]
  }])
})

test('rendering image embeds keeps image output semantics', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png',
    path: 'assets/cover.png',
    permalink: 'assets/cover.png'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/wiki/assets/cover.png')
  assert.equal(node.properties.alt, 'assets/cover.png')
  assert.equal(node.properties.title, 'assets/cover.png')
  assert.equal(node.properties['data-ofm-variant'], 'image')
})

test('rendering file embeds keeps link output semantics', () => {
  const node = createEmbedElement({
    value: 'manual.pdf',
    path: 'manual.pdf',
    permalink: 'manual.pdf'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assert.equal(node.tagName, 'a')
  assert.equal(node.properties.href, '/wiki/manual.pdf')
  assert.equal(node.properties.title, 'manual.pdf')
  assert.equal(node.properties['data-ofm-variant'], 'file')
  assert.deepEqual(node.children, [{type: 'text', value: 'manual.pdf'}])
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
  assertOfmPublicProps(node, {kind: 'anchor-target', variant: 'heading'})
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
  assertOfmPublicProps(node, {kind: 'anchor-target', variant: 'block', blockId: 'block-id'})
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
  assertOfmPublicProps(node, {kind: 'anchor-target', variant: 'block', blockId: 'block-id'})
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
      dataOfmKind: 'highlight'
    },
    children: [{type: 'text', value: 'highlighted'}]
  }

  highlightHast()(node)

  assertOfmPublicProps(node, {kind: 'highlight'})
  assertClassNames(node, [ofmClassNames.highlight])
  assert.equal(node.properties.dataOfmKind, undefined)
})

test('rehypeOfm removes OFM comment placeholders from rendered trees', () => {
  const tree = {
    type: 'root' as const,
    children: [
      {
        type: 'element' as const,
        tagName: 'p',
        properties: {},
        children: [
          {type: 'text' as const, value: 'Before '},
          createCommentElement('hidden note'),
          {type: 'text' as const, value: ' after'}
        ]
      }
    ]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  assert.deepEqual(tree.children[0]?.children, [
    {type: 'text', value: 'Before '},
    {type: 'text', value: ' after'}
  ])
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

test('getOfmNodeData recognizes comment and highlight nodes and ignores plain elements', () => {
  assert.deepEqual(getOfmNodeData(createCommentElement('hidden note').properties), {
    kind: 'comment',
    value: 'hidden note'
  })
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
      alt: 'example',
      className: 'embed-card'
    }),
    {
      'data-anchor-key': 'heading',
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
  blockId,
  size
}: {
  value: string
  path: string
  permalink: string
  alias?: string
  blockId?: string
  size?: {width?: number, height?: number}
}): Element {
  return createOfmElement('embed', 'span', {
    value,
    path,
    permalink,
    ...(alias === undefined ? {} : { alias }),
    ...(blockId === undefined ? {} : { blockId }),
    ...(size === undefined ? {} : { size })
  })
}

function createCommentElement(value: string): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      dataOfmKind: 'comment',
      dataOfmValue: value
    },
    children: []
  }
}

function createCalloutElement({
  calloutType,
  title,
  foldable,
  collapsed,
  children
}: {
  calloutType: string
  title: string
  foldable: boolean
  collapsed: boolean
  children: Element['children']
}): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      dataOfmKind: 'callout',
      dataOfmCalloutType: calloutType,
      dataOfmTitle: title,
      dataOfmFoldable: foldable,
      dataOfmCollapsed: collapsed
    },
    children
  }
}

function assertClassNames(node: Element, expected: string[]): void {
  assert.deepEqual(node.properties.className, expected)
}

function assertOfmPublicProps(
  node: Element,
  expected: {
    alias?: string
    blockId?: string
    fragment?: string
    kind: string
    path?: string
    permalink?: string
    variant?: string
  }
): void {
  assert.equal(node.properties['data-ofm-kind'], expected.kind)
  assert.equal(node.properties['data-ofm-variant'], expected.variant)
  assert.equal(node.properties['data-ofm-path'], expected.path)
  assert.equal(node.properties['data-ofm-permalink'], expected.permalink)
  assert.equal(node.properties['data-ofm-alias'], expected.alias)
  assert.equal(node.properties['data-ofm-block-id'], expected.blockId)
  assert.equal(node.properties['data-ofm-fragment'], expected.fragment)
}

function createOfmElement(
  kind: 'wikilink' | 'embed',
  tagName: string,
  {
    value,
    path,
    permalink,
    alias,
    blockId,
    size
  }: {
    value: string
    path: string
    permalink: string
    alias?: string
    blockId?: string
    size?: {width?: number, height?: number}
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
      dataOfmBlockId: blockId ?? '',
      ...(size?.width === undefined ? {} : { dataOfmWidth: size.width }),
      ...(size?.height === undefined ? {} : { dataOfmHeight: size.height })
    },
    children: []
  }
}
