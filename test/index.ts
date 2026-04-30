import './react-preset.js'

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
  normalizeOfmPath,
  rehypeOfm as publicRehypeOfm,
  remarkOfm as publicRemarkOfm
} from '../src/index.js'
import { anchorHast, normalizeOfmAnchorKey } from '../src/lib/anchor/hast.js'
import { calloutHast } from '../src/lib/callout/hast.js'
import { embedHast } from '../src/lib/embed/hast.js'
import { highlightHast } from '../src/lib/highlight/hast.js'
import {rehypeOfm, remarkOfm} from '../src/lib/index.js'
import {ofmClassNames} from '../src/lib/shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../src/lib/shared/ofm-node.js'
import {readOfmPublicProps, setOfmPublicProps} from '../src/lib/shared/public-props.js'
import type {OfmRemarkOptions} from '../src/lib/types.js'
import {parseWikiValue} from '../src/lib/wikilink/mdast.js'
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

test('root public API re-exports the core OFM plugins', () => {
  assert.equal(publicRemarkOfm, remarkOfm)
  assert.equal(publicRehypeOfm, rehypeOfm)
})

test('readOfmPublicProps reads shared OFM public props from an element', () => {
  const node: Element = {
    type: 'element',
    tagName: 'a',
    properties: {},
    children: []
  }

  setOfmPublicProps(node.properties, {
    kind: 'wikilink',
    path: 'Page',
    alias: 'Alias',
    fragment: 'Heading'
  })

  assert.deepEqual(readOfmPublicProps(node), {
    kind: 'wikilink',
    path: 'Page',
    alias: 'Alias',
    fragment: 'Heading'
  })
})

test('readOfmPublicProps ignores invalid public-prop values on an element', () => {
  const node: Element = {
    type: 'element',
    tagName: 'div',
    properties: {
      'data-ofm-kind': 'embed',
      'data-ofm-variant': 'not-supported',
      'data-ofm-provider': 'not-supported'
    },
    children: []
  }

  assert.equal(readOfmPublicProps(node), undefined)

  node.properties['data-ofm-kind'] = 'not-ofm'
  assert.equal(readOfmPublicProps(node), undefined)
})

test('build emits the public styles entrypoint', async () => {
  await access(path.join(repoRoot, 'dist', 'styles.css'))
})

test('library styles keep twitter embeds on the dedicated external-embed style path', async () => {
  const styles = await readUtf8(path.join(repoRoot, 'src', 'styles.css'))

  assert.match(styles, /\.ofm-external-embed\[data-ofm-provider='twitter'\]/)
  assert.doesNotMatch(styles, /\.ofm-embed\[data-ofm-provider='twitter'\]/)
})

test('demo styles scope youtube wrapper styling to the external embed class', async () => {
  const styles = await readUtf8(path.join(repoRoot, 'demo', 'src', 'styles.css'))

  assert.match(styles, /\.markdown-body \.ofm-external-embed\[data-ofm-provider='youtube'\]/)
  assert.doesNotMatch(styles, /\.markdown-body \.ofm-embed\[data-ofm-variant='external'\]/)
})

test('wikiLinkHast uses root-path default when hrefPrefix is omitted', () => {
  const node = createWikiLinkElement({
    value: 'Project Notes',
    path: 'Project Notes'
  })

  wikiLinkHast()(node)

  assert.equal(node.properties.href, '/project-notes')
  assert.equal(node.properties.title, 'Project Notes')
  assertClassNames(node, [ofmClassNames.wikilink])
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Project Notes'
  })
  assert.equal(node.properties.dataOfmKind, undefined)
})

test('wikiLinkHast uses hrefPrefix path plus fragment when provided', () => {
  const node = createWikiLinkElement({
    value: 'Page#Heading',
    path: 'Page',
    fragment: 'Heading'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/page#heading')
  assert.equal(node.properties.title, 'Page#Heading')
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    fragment: 'Heading'
  })
})

test('wikiLinkHast resolves aliases using the target path rather than alias text', () => {
  const node = createWikiLinkElement({
    value: 'Page|Alias',
    path: 'Page',
    alias: 'Alias'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/page')
  assert.equal(node.properties.title, 'Page')
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    alias: 'Alias'
  })
})

test('wikiLinkHast preserves block fragments with hrefPrefix', () => {
  const node = createWikiLinkElement({
    value: 'Page#^block-id',
    path: 'Page',
    fragment: '^block-id'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/page#^block-id')
  assert.equal(node.properties.title, 'Page#^block-id')
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    fragment: '^block-id'
  })
})

test('wikiLinkHast slugifies path segments and heading fragments with hrefPrefix', () => {
  const node = createWikiLinkElement({
    value: 'Folder Name/Page Name#Heading Here',
    path: 'Folder Name/Page Name',
    fragment: 'Heading Here'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/folder-name/page-name#heading-here')
  assert.equal(node.properties.title, 'Folder Name/Page Name#Heading Here')
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Folder Name/Page Name',
    fragment: 'Heading Here'
  })
})

test('wikiLinkHast collapses symbols into slug separators with hrefPrefix', () => {
  const node = createWikiLinkElement({
    value: 'R&D?Notes',
    path: 'R&D?Notes'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/r-d-notes')
})

test('wikiLinkHast preserves # inside a heading fragment', () => {
  const node = createWikiLinkElement({
    value: 'Page#A#B',
    path: 'Page',
    fragment: 'A#B'
  })

  wikiLinkHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.properties.href, '/notes/page#a#b')
  assert.equal(node.properties.title, 'Page#A#B')
  assertOfmPublicProps(node, {
    kind: 'wikilink',
    path: 'Page',
    fragment: 'A#B'
  })
})

test('wikiLinkHast can skip title assignment', () => {
  const node = createWikiLinkElement({
    value: 'Page',
    path: 'Page'
  })

  wikiLinkHast({ hrefPrefix: 'notes', setTitle: false })(node)

  assert.equal(node.properties.href, '/notes/page')
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
      .map((child) => ({path: child.path, fragment: child.fragment})),
    [
      {path: 'Alpha', fragment: undefined},
      {path: 'Beta', fragment: undefined}
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
    path: 'Project Notes'
  })

  embedHast()(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Project Notes')
  assertClassNames(node, [ofmClassNames.embed])
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes'
  })
  assert.equal(node.properties.dataOfmKind, undefined)
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/project-notes'},
    children: [{type: 'text', value: 'Project Notes'}]
  }])
})

test('embedHast renders markdown file embeds as semantic containers with fragments', () => {
  const node = createEmbedElement({
    value: 'Page.md#Heading',
    path: 'Page.md',
    fragment: 'Heading'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Page.md#Heading')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page.md',
    fragment: 'Heading'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/page-md#heading'},
    children: [{type: 'text', value: 'Page.md#Heading'}]
  }])
})

test('embedHast renders image embeds as images', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png',
    path: 'assets/cover.png'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/notes/assets/cover-png')
  assert.equal(node.properties.alt, 'assets/cover.png')
  assert.equal(node.properties.title, 'assets/cover.png')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'image',
    path: 'assets/cover.png'
  })
})

test('embedHast applies image width and height from embed size syntax', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png|100x145',
    path: 'assets/cover.png',
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
    path: 'manual.pdf'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'a')
  assert.equal(node.properties.href, '/notes/manual-pdf')
  assert.equal(node.properties.title, 'manual.pdf')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'file',
    path: 'manual.pdf'
  })
  assert.deepEqual(node.children, [{type: 'text', value: 'manual.pdf'}])
})

test('embedHast uses the target path rather than alias text for note embed title', () => {
  const node = createEmbedElement({
    value: 'Page|Alias',
    path: 'Page',
    alias: 'Alias'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Page')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page',
    alias: 'Alias'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/page'},
    children: [{type: 'text', value: 'Alias'}]
  }])
})

test('embedHast preserves block fragments with hrefPrefix for note embeds', () => {
  const node = createEmbedElement({
    value: 'Page#^block-id',
    path: 'Page',
    fragment: '^block-id'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page',
    fragment: '^block-id'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/page#^block-id'},
    children: [{type: 'text', value: 'Page#^block-id'}]
  }])
  assert.equal(node.properties.title, 'Page#^block-id')
})

test('embedHast slugifies path segments and heading fragments with hrefPrefix', () => {
  const node = createEmbedElement({
    value: 'Folder Name/Page Name#Heading Here',
    path: 'Folder Name/Page Name',
    fragment: 'Heading Here'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Folder Name/Page Name',
    fragment: 'Heading Here'
  })
  assert.equal(node.properties.title, 'Folder Name/Page Name#Heading Here')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/folder-name/page-name#heading-here'},
    children: [{type: 'text', value: 'Folder Name/Page Name#Heading Here'}]
  }])
})

test('embedHast collapses symbols into slug separators with hrefPrefix', () => {
  const node = createEmbedElement({
    value: 'R&D?Notes',
    path: 'R&D?Notes'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/r-d-notes'},
    children: [{type: 'text', value: 'R&D?Notes'}]
  }])
})

test('embedHast preserves # inside a heading fragment', () => {
  const node = createEmbedElement({
    value: 'Page#A#B',
    path: 'Page',
    fragment: 'A#B'
  })

  embedHast({ hrefPrefix: 'notes' })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, 'Page#A#B')
  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Page',
    fragment: 'A#B'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/notes/page#a#b'},
    children: [{type: 'text', value: 'Page#A#B'}]
  }])
})

test('embedHast can skip title assignment', () => {
  const node = createEmbedElement({
    value: 'Page',
    path: 'Page'
  })

  embedHast({ hrefPrefix: 'notes', setTitle: false })(node)

  assert.equal(node.tagName, 'div')
  assert.equal(node.properties.title, undefined)
})

test('rendering note embeds preserves fragment metadata and slug href output', () => {
  const node = createEmbedElement({
    value: 'Project Notes#Overview',
    path: 'Project Notes',
    fragment: 'Overview'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes',
    fragment: 'Overview'
  })
  assert.equal(node.properties.title, 'Project Notes#Overview')
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/wiki/project-notes#overview'},
    children: [{type: 'text', value: 'Project Notes#Overview'}]
  }])
})

test('rendering block embeds preserves fragment and block metadata', () => {
  const node = createEmbedElement({
    value: 'Roadmap#^next-step',
    path: 'Roadmap',
    fragment: '^next-step'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assertOfmPublicProps(node, {
    kind: 'embed',
    variant: 'note',
    path: 'Roadmap',
    fragment: '^next-step'
  })
  assert.deepEqual(node.children, [{
    type: 'element',
    tagName: 'a',
    properties: {href: '/wiki/roadmap#^next-step'},
    children: [{type: 'text', value: 'Roadmap#^next-step'}]
  }])
})

test('rendering image embeds keeps image output semantics', () => {
  const node = createEmbedElement({
    value: 'assets/cover.png',
    path: 'assets/cover.png'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assert.equal(node.tagName, 'img')
  assert.equal(node.properties.src, '/wiki/assets/cover-png')
  assert.equal(node.properties.alt, 'assets/cover.png')
  assert.equal(node.properties.title, 'assets/cover.png')
  assert.equal(node.properties['data-ofm-variant'], 'image')
})

test('rendering file embeds keeps link output semantics', () => {
  const node = createEmbedElement({
    value: 'manual.pdf',
    path: 'manual.pdf'
  })

  embedHast({ hrefPrefix: 'wiki' })(node)

  assert.equal(node.tagName, 'a')
  assert.equal(node.properties.href, '/wiki/manual-pdf')
  assert.equal(node.properties.title, 'manual.pdf')
  assert.equal(node.properties['data-ofm-variant'], 'file')
  assert.deepEqual(node.children, [{type: 'text', value: 'manual.pdf'}])
})


test('rehypeOfm lifts standalone note embeds out of paragraphs', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([createEmbedElement({
      value: 'Project Notes',
      path: 'Project Notes'
    })])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  const embed = tree.children[0]
  assert.equal(embed?.type, 'element')
  assert.equal(embed.tagName, 'div')
  assertOfmPublicProps(embed, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes'
  })
})

test('rehypeOfm splits paragraphs around note embeds', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([
      {type: 'text', value: 'Before '},
      createEmbedElement({value: 'Project Notes', path: 'Project Notes'}),
      {type: 'text', value: ' after'}
    ])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  assert.equal(tree.children.length, 3)
  assert.deepEqual(tree.children[0], createParagraphElement([{type: 'text', value: 'Before '}]))

  const embed = tree.children[1]
  assert.equal(embed?.type, 'element')
  assert.equal(embed.tagName, 'div')
  assertOfmPublicProps(embed, {
    kind: 'embed',
    variant: 'note',
    path: 'Project Notes'
  })

  assert.deepEqual(tree.children[2], createParagraphElement([{type: 'text', value: ' after'}]))
})

test('rehypeOfm keeps block anchor props on the last paragraph after note embed splitting', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([
      {type: 'text', value: 'Before '},
      createEmbedElement({value: 'Project Notes', path: 'Project Notes'}),
      {type: 'text', value: 'after'}
    ])]
  }

  anchorHast()(tree.children[0] as Element)

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  ;(tree.children[0] as Element).children.push({type: 'text', value: ' ^block-id'})
  anchorHast()(tree.children[0] as Element)
  transform(tree)

  const trailing = tree.children[2]
  assert.equal(trailing?.type, 'element')
  assert.equal(trailing.tagName, 'p')
  assert.equal(trailing.properties['data-anchor-key'], '^block-id')
  assert.equal(trailing.properties['data-ofm-block-id'], 'block-id')
  assert.deepEqual(trailing.children, [
    {type: 'text', value: 'after'},
    {
      type: 'element',
      tagName: 'span',
      properties: {className: [ofmClassNames.blockAnchorLabel]},
      children: [{type: 'text', value: '^block-id'}]
    }
  ])
})

test('rehypeOfm renders supported YouTube image URLs as external iframe embeds', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([createMarkdownImageElement({
      alt: 'Demo video',
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  const iframe = tree.children[0]
  assert.equal(iframe?.type, 'element')
  assert.equal(iframe.tagName, 'iframe')
  assert.equal(iframe.properties.src, 'https://www.youtube.com/embed/dQw4w9WgXcQ')
  assert.equal(iframe.properties.title, 'Demo video')
  assert.equal(iframe.properties.allowFullScreen, true)
  assert.equal(iframe.properties.loading, 'lazy')
  assertClassNames(iframe, [ofmClassNames.externalEmbed])
  assertOfmPublicProps(iframe, {
    kind: 'embed',
    variant: 'external',
    provider: 'youtube'
  })
})

test('rehypeOfm splits paragraphs around YouTube embeds', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([
      {type: 'text', value: 'Before '},
      createMarkdownImageElement({src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}),
      {type: 'text', value: ' after'}
    ])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  assert.equal(tree.children.length, 3)
  assert.deepEqual(tree.children[0], createParagraphElement([{type: 'text', value: 'Before '}]))
  const iframe = tree.children[1]
  assert.equal(iframe?.type, 'element')
  assert.equal(iframe.tagName, 'iframe')
  assert.deepEqual(tree.children[2], createParagraphElement([{type: 'text', value: ' after'}]))
})

test('rehypeOfm renders supported X status URLs as external tweet embeds', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([createMarkdownImageElement({
      src: 'https://x.com/jack/status/20'
    })])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  const tweet = tree.children[0]
  assert.equal(tweet?.type, 'element')
  assert.equal(tweet.tagName, 'div')
  assert.deepEqual(tweet.properties.className, [ofmClassNames.externalEmbed, 'twitter-tweet'])
  assertOfmPublicProps(tweet, {
    kind: 'embed',
    variant: 'external',
    provider: 'twitter'
  })

  const fallbackParagraph = tweet.children[0]
  assert.equal(fallbackParagraph?.type, 'element')
  assert.equal(fallbackParagraph.tagName, 'p')

  const fallbackLink = fallbackParagraph.children[0]
  assert.equal(fallbackLink?.type, 'element')
  assert.equal(fallbackLink.tagName, 'a')
  assert.equal(fallbackLink.properties.href, 'https://twitter.com/jack/status/20')
  assert.deepEqual(fallbackLink.children[0], {
    type: 'text',
    value: 'View post on X'
  })
  assert.equal(tweet.children[1], undefined)
})

test('rehypeOfm splits paragraphs around tweet embeds', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([
      {type: 'text', value: 'Before '},
      createMarkdownImageElement({src: 'https://x.com/jack/status/20'}),
      {type: 'text', value: ' after'}
    ])]
  }

  const transform = rehypeOfm.call(unified(), {}) as (tree: Root) => void
  transform(tree)

  assert.equal(tree.children.length, 3)
  assert.deepEqual(tree.children[0], createParagraphElement([{type: 'text', value: 'Before '}]))
  const tweet = tree.children[1]
  assert.equal(tweet?.type, 'element')
  assert.equal(tweet.tagName, 'div')
  assert.deepEqual(tree.children[2], createParagraphElement([{type: 'text', value: ' after'}]))
})

test('rehypeOfm can keep external image URLs on the normal image path', () => {
  const tree: Root = {
    type: 'root',
    children: [createParagraphElement([createMarkdownImageElement({
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })])]
  }

  const transform = rehypeOfm.call(unified(), {externalEmbeds: false}) as (tree: Root) => void
  transform(tree)

  const paragraph = tree.children[0]
  assert.equal(paragraph?.type, 'element')
  const image = paragraph.children[0]
  assert.equal(image?.type, 'element')
  assert.equal(image.tagName, 'img')
  assert.equal(image.properties.src, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  assert.equal(image.properties['data-ofm-kind'], undefined)
})


test('normalizeOfmAnchorKey matches anchor normalization behavior', () => {
  assert.equal(normalizeOfmAnchorKey('#Heading%20Here'), 'heading-here')
  assert.equal(normalizeOfmAnchorKey('#Heading#Subheading'), 'heading#subheading')
  assert.equal(normalizeOfmAnchorKey('#^Block-ID'), '^block-id')
  assert.equal(normalizeOfmAnchorKey('#学习 地图'), '学习-地图')
})

test('findOfmAnchorTarget locates the first matching data-anchor-key', () => {
  const alpha = {dataset: {anchorKey: 'alpha'}}
  const headingHere = {dataset: {anchorKey: 'heading-here'}}
  const nestedHeading = {dataset: {anchorKey: 'overview#detail'}}
  const headingWithHash = {dataset: {anchorKey: 'a#b'}}
  const cjkHeading = {dataset: {anchorKey: '学习-地图'}}
  const root = {
    querySelectorAll() {
      return [alpha, headingHere, nestedHeading, headingWithHash, cjkHeading]
    }
  }

  assert.equal(findOfmAnchorTarget(root, '#Heading%20Here'), headingHere)
  assert.equal(findOfmAnchorTarget(root, '#Overview#Detail'), nestedHeading)
  assert.equal(findOfmAnchorTarget(root, '#A#B'), headingWithHash)
  assert.equal(findOfmAnchorTarget(root, '#学习 地图'), cjkHeading)
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

  assert.equal(node.properties['data-anchor-key'], 'heading-here')
  assertOfmPublicProps(node, {kind: 'anchor-target', variant: 'heading'})
  assertClassNames(node, [ofmClassNames.anchorTarget, ofmClassNames.headingTarget])
})

test('anchorHast derives nested heading keys from the heading path fragment', () => {
  const transform = anchorHast()
  const section: Element = {
    type: 'element',
    tagName: 'h2',
    properties: {},
    children: [{type: 'text', value: 'Overview'}]
  }
  const subheading: Element = {
    type: 'element',
    tagName: 'h3',
    properties: {},
    children: [{type: 'text', value: 'Detail'}]
  }

  transform(section)
  transform(subheading)

  assert.equal(section.properties['data-anchor-key'], 'overview')
  assert.equal(subheading.properties['data-anchor-key'], 'overview#detail')
})

test('anchorHast extracts trailing block refs and renders labels by default', () => {
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

test('anchorHast can skip block anchor labels when disabled', () => {
  const node: Element = {
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [{type: 'text', value: 'Paragraph target. ^block-id'}]
  }

  anchorHast({renderBlockAnchorLabels: false})(node)

  assert.equal(node.properties['data-anchor-key'], '^block-id')
  assertOfmPublicProps(node, {kind: 'anchor-target', variant: 'block', blockId: 'block-id'})
  assertClassNames(node, [ofmClassNames.anchorTarget, ofmClassNames.blockTarget])
  assert.deepEqual(node.children, [{type: 'text', value: 'Paragraph target.'}])
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
    path: 'Page'
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
    alias: 'Alias',
    fragment: 'Heading Here'
  })

  assert.deepEqual(getOfmNodeData(node.properties), {
    kind: 'wikilink',
    value: 'Folder Name/Page Name#Heading Here|Alias',
    path: 'Folder Name/Page Name',
    fragment: 'Heading Here',
    alias: 'Alias'
  })
})

test('getOfmNodeData reads embed metadata using fragment-only targets', () => {
  const node = createEmbedElement({
    value: 'Page#^block-id',
    path: 'Page',
    fragment: '^block-id'
  })

  assert.deepEqual(getOfmNodeData(node.properties), {
    kind: 'embed',
    value: 'Page#^block-id',
    path: 'Page',
    fragment: '^block-id'
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
      dataOfmFragment: 'Heading',
      dataOfmKind: 'embed',
      dataOfmPath: 'Page',
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

test('buildOfmTargetUrl normalizes paths and slugifies heading or block fragments', () => {
  assert.equal(
    buildOfmTargetUrl(
      {
        path: 'Page',
        fragment: 'A#B'
      },
      'wiki'
    ),
    '/wiki/page#a#b'
  )

  assert.equal(
    buildOfmTargetUrl(
      {
        path: ' Folder%20Name / Page%20Name ',
        fragment: 'Heading Here'
      },
      'wiki'
    ),
    '/wiki/folder-name/page-name#heading-here'
  )

  assert.equal(
    buildOfmTargetUrl(
      {
        path: 'Page',
        fragment: '^block-id'
      },
      'wiki'
    ),
    '/wiki/page#^block-id'
  )
})

test('buildOfmTargetUrl slugifies mixed case, spaces, and symbols per path segment', () => {
  assert.equal(
    buildOfmTargetUrl(
      {
        path: ' Folder Name / R&D?Notes '
      },
      'wiki'
    ),
    '/wiki/folder-name/r-d-notes'
  )

  assert.equal(
    buildOfmTargetUrl(
      {
        path: '  Mixed___Case  /  .Hidden File.  '
      },
      'wiki'
    ),
    '/wiki/mixed-case/hidden-file'
  )

  assert.equal(
    buildOfmTargetUrl(
      {
        path: '学习/first-map',
        fragment: '学习 地图'
      },
      'wiki'
    ),
    '/wiki/学习/first-map#学习-地图'
  )
})

test('parseWikiValue keeps unsupported heading-plus-block syntax as a plain fragment string', () => {
  const parsed = parseWikiValue('Page#Heading#^block-id')

  assert.equal(parsed.path, 'Page')
  assert.equal(parsed.fragment, 'Heading#^block-id')
  assert.equal(parsed.alias, undefined)
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
  fragment,
  alias
}: {
  value: string
  path: string
  fragment?: string
  alias?: string
}): Element {
  return createOfmElement('wikilink', 'a', {
    value,
    path,
    ...(fragment === undefined ? {} : { fragment }),
    ...(alias === undefined ? {} : { alias })
  })
}

function createEmbedElement({
  value,
  path,
  fragment,
  alias,
  size
}: {
  value: string
  path: string
  fragment?: string
  alias?: string
  size?: {width?: number, height?: number}
}): Element {
  return createOfmElement('embed', 'span', {
    value,
    path,
    ...(fragment === undefined ? {} : { fragment }),
    ...(alias === undefined ? {} : { alias }),
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

function createMarkdownImageElement({
  alt,
  src
}: {
  alt?: string
  src: string
}): Element {
  return {
    type: 'element',
    tagName: 'img',
    properties: {
      src,
      ...(alt === undefined ? {} : {alt})
    },
    children: []
  }
}

function createParagraphElement(children: Element['children']): Element {
  return {
    type: 'element',
    tagName: 'p',
    properties: {},
    children
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
    provider?: string
    variant?: string
  }
): void {
  assert.equal(node.properties['data-ofm-kind'], expected.kind)
  assert.equal(node.properties['data-ofm-variant'], expected.variant)
  assert.equal(node.properties['data-ofm-path'], expected.path)
  assert.equal(node.properties['data-ofm-alias'], expected.alias)
  assert.equal(node.properties['data-ofm-block-id'], expected.blockId)
  assert.equal(node.properties['data-ofm-fragment'], expected.fragment)
  assert.equal(node.properties['data-ofm-provider'], expected.provider)
}

function createOfmElement(
  kind: 'wikilink' | 'embed',
  tagName: string,
  {
    value,
    path,
    fragment,
    alias,
    size
  }: {
    value: string
    path: string
    fragment?: string
    alias?: string
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
      dataOfmFragment: fragment ?? '',
      dataOfmAlias: alias ?? '',
      ...(size?.width === undefined ? {} : { dataOfmWidth: size.width }),
      ...(size?.height === undefined ? {} : { dataOfmHeight: size.height })
    },
    children: []
  }
}
