import type { ElementContent, Properties, Text } from 'hast'
import type { CompileContext, Extension, Handle } from 'mdast-util-from-markdown'
import type { Token } from 'micromark-util-types'

import type {  OfmRemarkOptions } from '../types.js'
import { parseWikiValue } from '../wikilink/mdast.js'
import type { Embed, EmbedSize } from './types.js'

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
  const size = parseEmbedSize(fields.alias)

  return {
    type: 'embed',
    value,
    path: fields.path,
    permalink: fields.permalink,
    ...(size === undefined && fields.alias === undefined ? {} : { alias: size === undefined ? fields.alias : undefined }),
    ...(fields.blockId === undefined ? {} : { blockId: fields.blockId }),
    ...(size === undefined ? {} : { size }),
    data: createEmbedData(value, fields.path, fields.permalink, size === undefined ? fields.alias : undefined, fields.blockId, size)
  }
}

function createEmbedData(
  value: string,
  path: string,
  permalink: string,
  alias?: string | null | undefined,
  blockId?: string | null | undefined,
  size?: EmbedSize | undefined
) {
  const hProperties: Properties = {
    dataOfmKind: 'embed',
    dataOfmValue: value,
    dataOfmPath: path,
    dataOfmPermalink: permalink,
    dataOfmAlias: alias ?? '',
    dataOfmBlockId: blockId ?? '',
    ...(size?.width === undefined ? {} : { dataOfmWidth: size.width }),
    ...(size?.height === undefined ? {} : { dataOfmHeight: size.height })
  }
  const hChildren: ElementContent[] = [{ type: 'text', value: `Embed: ${value}` } as Text]

  return {
    hName: 'span',
    hProperties,
    hChildren
  }
}

function parseEmbedSize(alias?: string | null | undefined): EmbedSize | undefined {
  if (!alias) {
    return undefined
  }

  const match = /^(\d+)(?:x(\d+))?$/.exec(alias.trim())

  if (!match) {
    return undefined
  }

  const width = Number(match[1])
  const height = match[2] === undefined ? undefined : Number(match[2])

  return {
    width,
    ...(height === undefined ? {} : { height })
  }
}
