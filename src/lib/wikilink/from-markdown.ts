import type {CompileContext, Extension as FromMarkdownExtension, Handle as FromMarkdownHandle} from 'mdast-util-from-markdown'
import type {Token} from 'micromark-util-types'

import type {Embed, OfmOptions, WikiLink} from '../types.js'
import {parseWikiValue} from './utils.js'

export function ofmFromMarkdown(options: OfmOptions = {}): FromMarkdownExtension {
  const enter: Record<string, FromMarkdownHandle> = {}
  const exit: Record<string, FromMarkdownHandle> = {}
  const canContainEols: string[] = []

  if (options.wikilinks !== false || options.embeds !== false) {
    enter.ofmEmbed = enterEmbed
    enter.ofmWikiLink = enterWikiLink
    exit.ofmEmbed = exitWiki
    exit.ofmWikiLink = exitWiki
  }

  if (Object.keys(enter).length === 0 && Object.keys(exit).length === 0) {
    return {}
  }

  return {
    ...(canContainEols.length === 0 ? {} : {canContainEols}),
    enter,
    exit
  }
}

const enterWikiLink: FromMarkdownHandle = function (token) {
  this.enter(createWikiNode(this, token, 'wikiLink'), token)
}

const enterEmbed: FromMarkdownHandle = function (token) {
  this.enter(createWikiNode(this, token, 'embed'), token)
}

const exitWiki: FromMarkdownHandle = function (token) {
  this.exit(token)
}

function createWikiNode(context: CompileContext, token: Token, type: 'wikiLink' | 'embed'): WikiLink | Embed {
  const raw = context.sliceSerialize(token)
  const value = raw.slice(type === 'embed' ? 3 : 2, -2)
  const fields = parseWikiValue(value)

  return {
    type,
    value,
    path: fields.path,
    permalink: fields.permalink,
    ...(fields.alias === undefined ? {} : {alias: fields.alias}),
    ...(fields.blockId === undefined ? {} : {blockId: fields.blockId})
  }
}