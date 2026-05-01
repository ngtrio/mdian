import type {Element, Root, RootContent, Text} from 'hast'

import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {normalizeOfmFragmentAnchorKey} from '../shared/ofm-url.js'
import type {OfmRehypeOptions} from '../types.js'

const blockIdPattern = /^(.*?)(?:\s+)\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/s

export function anchorHast(options: Partial<Pick<OfmRehypeOptions, 'renderBlockAnchorLabels'>> = {}): (node: Root | RootContent) => void {
  const renderBlockAnchorLabels = options.renderBlockAnchorLabels ?? true
  const headingPathKeys: string[] = []

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    if (isHeadingElement(node)) {
      const anchorKey = getHeadingAnchorKey(node, headingPathKeys)

      if (anchorKey) {
        node.properties.id = anchorKey
        addClassName(node.properties, ofmClassNames.headingTarget)
      }
    }

    if (node.tagName === 'p' || node.tagName === 'li') {
      const blockId = stripTrailingBlockId(node)

      if (blockId) {
        node.properties.id = normalizeOfmFragmentAnchorKey(`^${blockId}`)
        node.properties['data-ofm-block-id'] = blockId
        addClassName(node.properties, ofmClassNames.blockTarget)

        if (renderBlockAnchorLabels) {
          appendBlockAnchorLabel(node, blockId)
        }
      }
    }
  }
}

function isHeadingElement(node: Element): boolean {
  return /^h[1-6]$/.test(node.tagName)
}

function getHeadingAnchorKey(node: Element, headingPathKeys: string[]): string {
  const titleKey = normalizeOfmFragmentAnchorKey(extractTextContent(node))

  if (!titleKey) {
    return ''
  }

  const level = Number(node.tagName.slice(1))

  if (!Number.isFinite(level) || level <= 1) {
    headingPathKeys.length = 0
    return titleKey
  }

  const hierarchyIndex = level - 2
  headingPathKeys.length = hierarchyIndex
  const parentKey = headingPathKeys[hierarchyIndex - 1]
  const anchorKey = parentKey ? `${parentKey}#${titleKey}` : titleKey
  headingPathKeys[hierarchyIndex] = anchorKey
  return anchorKey
}

function extractTextContent(node: Root | RootContent): string {
  if (node.type === 'text') {
    return node.value
  }

  if (!('children' in node) || !Array.isArray(node.children)) {
    return ''
  }

  return node.children.map((child) => extractTextContent(child)).join('')
}

function stripTrailingBlockId(node: Element): string | undefined {
  const lastChild = node.children.at(-1)

  if (!isTextNode(lastChild)) {
    return undefined
  }

  const match = lastChild.value.match(blockIdPattern)

  if (!match) {
    return undefined
  }

  const [, content, blockId] = match

  if (content) {
    lastChild.value = content
  } else {
    node.children.pop()
  }

  return blockId
}

function isTextNode(node: RootContent | undefined): node is Text {
  return node?.type === 'text'
}

function appendBlockAnchorLabel(node: Element, blockId: string): void {
  node.children.push({
    type: 'element',
    tagName: 'span',
    properties: {
      className: [ofmClassNames.blockAnchorLabel]
    },
    children: [
      {
        type: 'text',
        value: `^${blockId}`
      }
    ]
  })
}
