import type {Plugin} from 'unified'
import type {Root, Parent, Content, Blockquote, Paragraph, PhrasingContent, RootContent, Text} from 'mdast'
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
    contentChildren.push(parsed.body)
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

function parseCalloutParagraph(node: Paragraph): {calloutType: string, title: string, foldable: boolean, collapsed: boolean, body?: Paragraph} | undefined {
  const [firstChild, ...restChildren] = node.children
  if (firstChild?.type !== 'text') {
    return undefined
  }

  const lineBreakIndex = firstChild.value.indexOf('\n')
  const header = lineBreakIndex === -1 ? firstChild.value : firstChild.value.slice(0, lineBreakIndex)
  const match = calloutPattern.exec(header)
  if (!match) {
    return undefined
  }

  if (lineBreakIndex === -1 && restChildren.length > 0) {
    return undefined
  }

  const marker = match[2]
  const bodyChildren: PhrasingContent[] = []

  if (lineBreakIndex !== -1) {
    const firstBodyValue = firstChild.value.slice(lineBreakIndex + 1)
    if (firstBodyValue.length > 0) {
      bodyChildren.push(createText(firstChild, firstBodyValue))
    }
    bodyChildren.push(...restChildren)
  }

  const body = createParagraph(bodyChildren)

  return {
    calloutType: (match[1] ?? '').toLowerCase(),
    title: (match[3] ?? '').trim(),
    foldable: marker === '+' || marker === '-',
    collapsed: marker === '-',
    ...(body === undefined ? {} : {body})
  }
}

function createParagraph(children: PhrasingContent[]): Paragraph | undefined {
  if (!hasParagraphContent(children)) {
    return undefined
  }

  return {
    type: 'paragraph',
    children
  }
}

function createText(node: Text, value: string): Text {
  return {...node, value}
}

function hasParagraphContent(children: PhrasingContent[]): boolean {
  return children.some((child) => child.type !== 'text' || child.value.trim().length > 0)
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
