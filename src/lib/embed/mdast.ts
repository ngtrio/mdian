import type { ElementContent, Properties, Text } from 'hast'
import type { CompileContext, Extension, Handle } from 'mdast-util-from-markdown'
import type { Token } from 'micromark-util-types'

import type {  OfmRemarkOptions } from '../types.js'
import { parseWikiValue } from '../wikilink/mdast.js'
import type { Embed } from './types.js'

export function embedMast(options: OfmRemarkOptions = {}): Extension {
  const enter: Record<string, Handle> = {}
  const exit: Record<string, Handle> = {}

  enter.ofmEmbed = enterEmbed
  exit.ofmEmbed = exitEmbed

  return { enter, exit }
}

const enterEmbed: Handle = function (token) {
  this.enter(createEmbedNode(this, token), token)
}

const exitEmbed: Handle = function (token) {
  this.exit(token)
}

function createEmbedNode(context: CompileContext, token: Token): Embed {
  const raw = context.sliceSerialize(token)
  const value = raw.slice(3, -2)
  const fields = parseWikiValue(value)

  return {
    type: 'embed',
    value,
    path: fields.path,
    permalink: fields.permalink,
    ...(fields.alias === undefined ? {} : { alias: fields.alias }),
    ...(fields.blockId === undefined ? {} : { blockId: fields.blockId }),
    data: createEmbedData(value, fields.path, fields.permalink, fields.alias, fields.blockId)
  }
}

function createEmbedData(
  value: string,
  path: string,
  permalink: string,
  alias?: string | null | undefined,
  blockId?: string | null | undefined
) {
  const hProperties: Properties = {
    dataOfmKind: 'embed',
    dataOfmValue: value,
    dataOfmPath: path,
    dataOfmPermalink: permalink,
    dataOfmAlias: alias ?? '',
    dataOfmBlockId: blockId ?? ''
  }
  const hChildren: ElementContent[] = [{ type: 'text', value: `Embed: ${value}` } as Text]

  return {
    hName: 'span',
    hProperties,
    hChildren
  }
}
