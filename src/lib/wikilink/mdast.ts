import type { ElementContent, Properties, Text } from 'hast'
import type { CompileContext, Extension, Handle } from 'mdast-util-from-markdown'
import type { Token } from 'micromark-util-types'

import type { OfmRemarkOptions } from '../types.js'
import type { WikiLink } from './types.js'

export function wikiLinkMast(options: OfmRemarkOptions = {}): Extension {
  const enter: Record<string, Handle> = {}
  const exit: Record<string, Handle> = {}

  enter.ofmWikiLink = enterWikiLink
  exit.ofmWikiLink = exitWikiLink

  return {
    enter,
    exit
  }
}

const enterWikiLink: Handle = function (token) {
  this.enter(createWikiLinkNode(this, token), token)
}

const exitWikiLink: Handle = function (token) {
  this.exit(token)
}

function createWikiLinkNode(context: CompileContext, token: Token): WikiLink {
  const raw = context.sliceSerialize(token)
  const value = raw.slice(2, -2)
  const fields = parseWikiValue(value)

  return {
    type: 'wikiLink',
    value,
    path: fields.path,
    permalink: fields.permalink,
    ...(fields.alias === undefined ? {} : { alias: fields.alias }),
    ...(fields.blockId === undefined ? {} : { blockId: fields.blockId }),
    data: createWikiLinkData(value, fields.path, fields.permalink, fields.alias, fields.blockId)
  }
}

function createWikiLinkData(
  value: string,
  path: string,
  permalink: string,
  alias?: string | null | undefined,
  blockId?: string | null | undefined
) {
  const label = alias ?? path ?? permalink ?? value ?? 'wiki link'
  const hProperties: Properties = {
    dataOfmKind: 'wikilink',
    dataOfmValue: value,
    dataOfmPath: path,
    dataOfmPermalink: permalink,
    dataOfmAlias: alias ?? '',
    dataOfmBlockId: blockId ?? ''
  }
  const hChildren: ElementContent[] = [{ type: 'text', value: label } as Text]

  return {
    hName: 'a',
    hProperties,
    hChildren
  }
}

export function parseWikiValue(value: string) {
  const pipeIndex = value.indexOf('|')
  const permalink = pipeIndex === -1 ? value : value.slice(0, pipeIndex)
  const alias = pipeIndex === -1 ? undefined : value.slice(pipeIndex + 1)

  const hashIndex = permalink.indexOf('#')
  const path = hashIndex === -1 ? permalink : permalink.slice(0, hashIndex)
  const anchor = hashIndex === -1 ? undefined : permalink.slice(hashIndex + 1)
  const blockId = anchor?.startsWith('^') ? anchor.slice(1) : undefined

  return { alias, blockId, path, permalink }
}
