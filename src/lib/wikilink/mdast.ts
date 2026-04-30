import type { ElementContent, Properties, Text } from 'hast'
import type { CompileContext, Extension, Handle } from 'mdast-util-from-markdown'
import type { Token } from 'micromark-util-types'

import type { OfmRemarkOptions } from '../types.js'
import {decodeOfmFragment} from '../shared/ofm-url.js'
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
    ...(fields.fragment === undefined ? {} : {fragment: fields.fragment}),
    ...(fields.alias === undefined ? {} : { alias: fields.alias }),
    data: createWikiLinkData(value, fields.path, fields.fragment, fields.alias)
  }
}

function createWikiLinkData(
  value: string,
  path: string,
  fragment?: string | null,
  alias?: string | null
) {
  const label = alias ?? path ?? value ?? 'wiki link'
  const hProperties: Properties = {
    dataOfmKind: 'wikilink',
    dataOfmValue: value,
    dataOfmPath: path,
    dataOfmFragment: fragment ?? '',
    dataOfmAlias: alias ?? ''
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
  const target = pipeIndex === -1 ? value : value.slice(0, pipeIndex)
  const alias = pipeIndex === -1 ? undefined : value.slice(pipeIndex + 1)

  const hashIndex = target.indexOf('#')
  const path = hashIndex === -1 ? target : target.slice(0, hashIndex)
  const fragmentValue = hashIndex === -1 ? undefined : decodeOfmFragment(target.slice(hashIndex + 1))
  const fragment = fragmentValue && fragmentValue.length > 0 ? fragmentValue : undefined

  return { alias, fragment, path }
}
