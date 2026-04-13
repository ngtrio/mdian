import type { Properties } from 'hast'
import type { Extension, Handle } from 'mdast-util-from-markdown'

import type { OfmRemarkOptions } from '../types.js'
import type { Highlight } from './types.js'

export function highlightMast(options: OfmRemarkOptions = {}): Extension {
  const enter: Record<string, Handle> = {}
  const exit: Record<string, Handle> = {}
  const canContainEols: string[] = []

  canContainEols.push('highlight')
  enter.highlight = enterHighlight
  exit.highlight = exitHighlight

  return {
    ...(canContainEols.length === 0 ? {} : { canContainEols }),
    enter,
    exit
  }
}

const enterHighlight: Handle = function (token) {
  this.enter({ type: 'highlight', children: [], data: createHighlightData() } as Highlight, token)
}

const exitHighlight: Handle = function (token) {
  this.exit(token)
}

function createHighlightData() {
  const hProperties: Properties = {
    dataOfmKind: 'highlight'
  }

  return {
    hName: 'mark',
    hProperties
  }
}
