import type { Properties } from 'hast'
import type { CompileContext, Extension, Handle } from 'mdast-util-from-markdown'
import type { Token } from 'micromark-util-types'

import type { OfmRemarkOptions } from '../types.js'
import type { OfmComment } from './types.js'

export function commentMast(options: OfmRemarkOptions = {}): Extension {
  const enter: Record<string, Handle> = {}
  const exit: Record<string, Handle> = {}

  enter.ofmComment = enterComment
  exit.ofmComment = exitComment

  return { enter, exit }
}

const enterComment: Handle = function (token) {
  this.enter(createCommentNode(this, token), token)
}

const exitComment: Handle = function (token) {
  this.exit(token)
}

function createCommentNode(context: CompileContext, token: Token): OfmComment {
  const raw = context.sliceSerialize(token)
  const value = raw.slice(2, -2)

  return {
    type: 'comment',
    value,
    data: createCommentData(value)
  }
}

function createCommentData(value: string) {
  const hProperties: Properties = {
    dataOfmKind: 'comment',
    dataOfmValue: value
  }

  return {
    hName: 'span',
    hProperties,
    hChildren: []
  }
}
