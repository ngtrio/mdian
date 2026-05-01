import type {Element, ElementContent, Properties, RootContent} from 'hast'

import {ofmClassNames} from './class-name.js'

export function splitParagraphChildren(
  node: RootContent | {children: RootContent[]; type: 'root'},
  isSplitPoint: (child: ElementContent) => boolean
): void {
  if (!('children' in node) || !Array.isArray(node.children)) {
    return
  }

  const nextChildren: RootContent[] = []

  for (const child of node.children) {
    if (!isParagraphElement(child)) {
      nextChildren.push(child)
      continue
    }

    const replacement = splitParagraphElement(child, isSplitPoint)
    nextChildren.push(...replacement)
  }

  node.children = nextChildren
}

function splitParagraphElement(node: Element, isSplitPoint: (child: ElementContent) => boolean): RootContent[] {
  const blockAnchorProps = readBlockAnchorProps(node)
  const children = blockAnchorProps?.label ? node.children.slice(0, -1) : node.children
  const segments: RootContent[] = []
  let paragraphChildren: ElementContent[] = []
  let didSplit = false

  for (const child of children) {
    if (!isSplitPoint(child)) {
      paragraphChildren.push(child)
      continue
    }

    didSplit = true
    pushParagraphSegment(segments, paragraphChildren)
    paragraphChildren = []
    segments.push(child)
  }

  if (!didSplit) {
    return [node]
  }

  pushParagraphSegment(segments, paragraphChildren)
  moveBlockAnchorPropsToLastParagraph(segments, blockAnchorProps)
  return segments
}

function pushParagraphSegment(segments: RootContent[], children: ElementContent[]): void {
  if (children.length === 0) {
    return
  }

  segments.push({
    type: 'element',
    tagName: 'p',
    properties: {},
    children: [...children]
  })
}

function moveBlockAnchorPropsToLastParagraph(
  segments: RootContent[],
  blockAnchorProps: {label?: ElementContent; properties: Properties} | undefined
): void {
  if (!blockAnchorProps) {
    return
  }

  const lastParagraph = findLastParagraph(segments)

  if (!lastParagraph) {
    return
  }

  Object.assign(lastParagraph.properties, blockAnchorProps.properties)

  if (blockAnchorProps.label) {
    lastParagraph.children.push(blockAnchorProps.label)
  }
}

function findLastParagraph(nodes: RootContent[]): Element | undefined {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node && isParagraphElement(node)) {
      return node
    }
  }

  return undefined
}

function readBlockAnchorProps(node: Element): {label?: ElementContent; properties: Properties} | undefined {
  if (typeof node.properties['data-ofm-block-id'] !== 'string' || node.properties['data-ofm-block-id'].length === 0) {
    return undefined
  }

  const properties: Properties = {}
  copyStringProp(node.properties, properties, 'id')
  copyStringProp(node.properties, properties, 'data-ofm-block-id')

  const className = readBlockAnchorClassNames(node.properties.className)
  if (className.length > 0) {
    properties.className = className
  }

  const lastChild = node.children.at(-1)
  const label = isBlockAnchorLabel(lastChild)
    ? {
        ...lastChild,
        properties: {...lastChild.properties},
        children: [...lastChild.children]
      }
    : undefined

  return {properties, ...(label === undefined ? {} : {label})}
}

function readBlockAnchorClassNames(value: unknown, excludeBlockAnchorClasses = false): string[] {
  const names = new Set<string>()
  const blacklist = excludeBlockAnchorClasses
    ? new Set<string>([ofmClassNames.blockTarget])
    : undefined

  const add = (token: string) => {
    if (token.length === 0 || blacklist?.has(token)) {
      return
    }
    names.add(token)
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        for (const token of item.split(/\s+/)) {
          add(token)
        }
      }
    }
  } else if (typeof value === 'string') {
    for (const token of value.split(/\s+/)) {
      add(token)
    }
  }

  return [...names]
}

function copyStringProp(source: Properties, target: Properties, key: string): void {
  const value = source[key]
  if (typeof value === 'string' && value.length > 0) {
    target[key] = value
  }
}

function isParagraphElement(node: RootContent | ElementContent): node is Element {
  return node.type === 'element' && node.tagName === 'p'
}

function isBlockAnchorLabel(node: ElementContent | undefined): node is Element {
  return node?.type === 'element'
    && node.tagName === 'span'
    && Array.isArray(node.properties.className)
    && node.properties.className.includes(ofmClassNames.blockAnchorLabel)
}
