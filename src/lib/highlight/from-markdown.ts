import type {Extension as FromMarkdownExtension, Handle as FromMarkdownHandle} from 'mdast-util-from-markdown'

import type {Highlight, OfmOptions} from '../types.js'

export function ofmFromMarkdown(options: OfmOptions = {}): FromMarkdownExtension {
  const enter: Record<string, FromMarkdownHandle> = {}
  const exit: Record<string, FromMarkdownHandle> = {}
  const canContainEols: string[] = []

  if (options.highlights !== false) {
    canContainEols.push('highlight')
    enter.highlight = enterHighlight
    exit.highlight = exitHighlight
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

const enterHighlight: FromMarkdownHandle = function (token) {
  this.enter({type: 'highlight', children: []} as Highlight, token)
}

const exitHighlight: FromMarkdownHandle = function (token) {
  this.exit(token)
}
