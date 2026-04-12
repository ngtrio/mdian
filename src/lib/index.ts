import type {Processor} from 'unified'

import {gfmFromMarkdown} from 'mdast-util-gfm'
import {mathFromMarkdown} from 'mdast-util-math'
import {gfm} from 'micromark-extension-gfm'
import {math} from 'micromark-extension-math'
import type {Construct, Extension as SyntaxExtension} from 'micromark-util-types'
import {codes} from 'micromark-util-symbol'

import {ofmFromMarkdown as embedFromMarkdown, embedConstruct} from './embed/index.js'
import {ofmFromMarkdown as highlightFromMarkdown, highlightConstruct} from './highlight/index.js'
import type {Options} from './types.js'
import {ofmFromMarkdown as wikilinkFromMarkdown, wikiLinkConstruct} from './wikilink/index.js'

type BucketKey = 'micromarkExtensions' | 'fromMarkdownExtensions'
type ExtensionBucket = Array<unknown>

function getBucket(processor: Processor, key: BucketKey): ExtensionBucket {
  const data = processor.data() as Record<BucketKey, ExtensionBucket | undefined>
  const existing = data[key]

  if (Array.isArray(existing)) {
    return existing
  }

  const created: ExtensionBucket = []
  data[key] = created
  return created
}

export function remarkOfm(this: Processor, options: Options = {}): void {
  getBucket(this, 'micromarkExtensions').push(gfm(options), math(options), ofm(options))
  getBucket(this, 'fromMarkdownExtensions').push(
    gfmFromMarkdown(),
    mathFromMarkdown(),
    wikilinkFromMarkdown(options),
    embedFromMarkdown(options),
    highlightFromMarkdown(options)
  )
}

function ofm(options: Options = {}): SyntaxExtension {
  const text: Record<number, Construct> = {}
  const insideSpan: Array<Pick<Construct, 'resolveAll'>> = []
  const attentionMarkers: number[] = []
  const leftSquareBracket = '['.charCodeAt(0)
  const exclamationMark = '!'.charCodeAt(0)

  if (options.wikilinks !== false) {
    text[leftSquareBracket] = wikiLinkConstruct
  }

  if (options.embeds !== false) {
    text[exclamationMark] = embedConstruct
  }

  if (options.highlights !== false) {
    text[codes.equalsTo] = highlightConstruct
    insideSpan.push(highlightConstruct)
    attentionMarkers.push(codes.equalsTo)
  }

  if (Object.keys(text).length === 0) {
    return {}
  }

  return {
    text,
    ...(insideSpan.length === 0 ? {} : {insideSpan: {null: insideSpan}}),
    ...(attentionMarkers.length === 0 ? {} : {attentionMarkers: {null: attentionMarkers}})
  }
}

export default remarkOfm
