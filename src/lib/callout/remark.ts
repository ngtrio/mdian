import type {Plugin} from 'unified'
import type {Root, Parent, Content, Blockquote, Paragraph, PhrasingContent, RootContent} from 'mdast'
import type {Properties} from 'hast'

import type {OfmRemarkOptions} from '../types.js'
import type {Callout} from './types.js'

const calloutPattern = /^\[!([\w-]+)\]([+-])?(?:\s+(.*))?$/

export const calloutRemark: Plugin<[OfmRemarkOptions?], Root> = function calloutRemark(options = {}) {
  return function transform(tree) {
    if (!(options.callouts ?? true)) {
      return
    }

    visitParent(tree, (parent) => {
      for (let index = 0; index < parent.children.length; index++) {
        const node = parent.children[index]
        if (node?.type !== 'blockquote') {
          continue
        }

        const callout = toCallout(node)
        if (callout) {
          parent.children[index] = callout
        }
      }
    })
  }
}

function toCallout(node: Blockquote): Callout | undefined {
  const [firstChild, ...restChildren] = node.children
  if (!firstChild || firstChild.type !== 'paragraph') {
    return undefined
  }

  const parsed = parseCalloutParagraph(firstChild)
  if (!parsed) {
    return undefined
  }

  const contentChildren: RootContent[] = []
  if (parsed.body) {
    contentChildren.push(createParagraph(parsed.body))
  }
  contentChildren.push(...restChildren.map((child) => child.type === 'blockquote' ? toCallout(child) ?? child : child))

  return {
    type: 'callout',
    calloutType: parsed.calloutType,
    title: parsed.title,
    foldable: parsed.foldable,
    collapsed: parsed.collapsed,
    children: contentChildren,
    data: {
      hName: 'div',
      hProperties: {
        dataOfmKind: 'callout',
        dataOfmCalloutType: parsed.calloutType,
        dataOfmTitle: parsed.title,
        dataOfmFoldable: parsed.foldable,
        dataOfmCollapsed: parsed.collapsed
      }
    }
  }
}

function parseCalloutParagraph(node: Paragraph): {calloutType: string, title: string, foldable: boolean, collapsed: boolean, body: string} | undefined {
  if (node.children.length !== 1 || node.children[0]?.type !== 'text') {
    return undefined
  }

  const value = node.children[0].value
  const [header, ...bodyLines] = value.split('\n')
  const match = calloutPattern.exec(header ?? '')
  if (!match) {
    return undefined
  }

  const marker = match[2]

  return {
    calloutType: (match[1] ?? '').toLowerCase(),
    title: (match[3] ?? '').trim(),
    foldable: marker === '+' || marker === '-',
    collapsed: marker === '-',
    body: bodyLines.join('\n').trim()
  }
}

function createParagraph(value: string): Paragraph {
  return {
    type: 'paragraph',
    children: [{type: 'text', value} as PhrasingContent]
  }
}

function visitParent(node: Root | Parent, visitor: (node: Parent) => void): void {
  if (!('children' in node) || !Array.isArray(node.children)) {
    return
  }

  visitor(node)

  for (const child of node.children) {
    if (child && typeof child === 'object' && 'children' in child && Array.isArray(child.children)) {
      visitParent(child as Parent, visitor)
    }
  }
}
