import type {CompileContext, Extension as FromMarkdownExtension, Handle as FromMarkdownHandle} from 'mdast-util-from-markdown'
import type {Token} from 'micromark-util-types'

import type {Embed, OfmOptions} from '../types.js'
import {parseWikiValue} from '../wikilink/utils.js'

export function ofmFromMarkdown(options: OfmOptions = {}): FromMarkdownExtension {
  const enter: Record<string, FromMarkdownHandle> = {}
  const exit: Record<string, FromMarkdownHandle> = {}

  if (options.embeds !== false) {
    enter.ofmEmbed = enterEmbed
    exit.ofmEmbed = exitEmbed
  }

  if (Object.keys(enter).length === 0 && Object.keys(exit).length === 0) {
    return {}
  }

  return {enter, exit}
}

const enterEmbed: FromMarkdownHandle = function (token) {
  this.enter(createEmbedNode(this, token), token)
}

const exitEmbed: FromMarkdownHandle = function (token) {
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
    ...(fields.alias === undefined ? {} : {alias: fields.alias}),
    ...(fields.blockId === undefined ? {} : {blockId: fields.blockId})
  }
}
