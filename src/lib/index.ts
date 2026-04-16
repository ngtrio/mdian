import type { Processor, Plugin } from 'unified'
import type { Root, RootContent } from 'hast'
import type { Construct, Extension as SyntaxExtension } from 'micromark-util-types'
import { codes } from 'micromark-util-symbol'
import { anchorHast } from './anchor/index.js'
import { embedTokenizer, embedMast, embedHast } from './embed/index.js'
import { highlightTokenizer, highlightMast, highlightHast } from './highlight/index.js'
import type { OfmRemarkOptions, OfmRehypeOptions } from './types.js'
import { wikiLinkTokenizer, wikiLinkMast, wikiLinkHast } from './wikilink/index.js'

type BucketKey = 'micromarkExtensions' | 'fromMarkdownExtensions'
type ExtensionBucket = Array<unknown>

export function getBucket(processor: Processor, key: BucketKey): ExtensionBucket {
  const data = processor.data() as Record<BucketKey, ExtensionBucket | undefined>
  const existing = data[key]

  if (Array.isArray(existing)) {
    return existing
  }

  const created: ExtensionBucket = []
  data[key] = created
  return created
}

export function remarkOfm(this: Processor, options: OfmRemarkOptions = {}): void {
  getBucket(this, 'micromarkExtensions').push(ofmSyntex(options))

  const fromMarkdownExtensions = []

  if (options.wikilinks ?? true) {
    fromMarkdownExtensions.push(wikiLinkMast(options))
  }

  if (options.embeds ?? true) {
    fromMarkdownExtensions.push(embedMast(options))
  }

  if (options.highlights ?? true) {
    fromMarkdownExtensions.push(highlightMast(options))
  }

  getBucket(this, 'fromMarkdownExtensions').push(...fromMarkdownExtensions)
}

export function ofmSyntex(options: OfmRemarkOptions = {}): SyntaxExtension {
  const text: Record<number, Construct> = {}
  const insideSpan: Array<Pick<Construct, 'resolveAll'>> = []
  const attentionMarkers: number[] = []

  if (options.wikilinks ?? true) {
    text[codes.leftSquareBracket] = wikiLinkTokenizer
  }

  if (options.embeds ?? true) {
    text[codes.exclamationMark] = embedTokenizer
  }

  if (options.highlights ?? true) {
    text[codes.equalsTo] = highlightTokenizer
    insideSpan.push(highlightTokenizer)
    attentionMarkers.push(codes.equalsTo)
  }

  return {
    text,
    ...(insideSpan.length === 0 ? {} : { insideSpan: { null: insideSpan } }),
    ...(attentionMarkers.length === 0 ? {} : { attentionMarkers: { null: attentionMarkers } })
  }
}

export const rehypeOfm: Plugin<[OfmRehypeOptions?], Root> = function rehypeOfm(options = {}) {
  const transformAnchor = anchorHast(options)
  const transformWikiLink = wikiLinkHast(options)
  const transformEmbed = embedHast(options)
  const transformHighlight = highlightHast()

  return function transform(tree) {
    visit(tree, (node) => {
      transformAnchor(node)
      transformWikiLink(node)
      transformEmbed(node)
      transformHighlight(node)
    })
  }
}

function visit(node: Root | RootContent, visitor: (node: Root | RootContent) => void): void {
  visitor(node)

  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child, visitor)
    }
  }
}

export {findOfmAnchorTarget, getOfmAnchorKeyFromHash, normalizeOfmAnchorKey} from './anchor/index.js'
export {buildOfmTargetUrl, decodeOfmFragment, normalizeOfmPath} from './ofm-url.js'
