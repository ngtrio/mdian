import type {Element, Root, RootContent, Text} from 'hast'

import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {setOfmPublicProps} from '../shared/public-props.js'
import {decodeOfmFragment} from '../shared/ofm-url.js'
import type {OfmRehypeOptions} from '../types.js'

const blockIdPattern = /^(.*?)(?:\s+)\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/s

export interface OfmAnchorTargetLike {
  dataset?: {
    anchorKey?: string | undefined
  }
}

export interface OfmAnchorRootLike<T extends OfmAnchorTargetLike = OfmAnchorTargetLike> {
  querySelectorAll(selector: string): Iterable<T>
}

export function normalizeOfmAnchorKey(value: string | null | undefined): string {
  return decodeOfmFragment(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

export function getOfmAnchorKeyFromHash(value: string | null | undefined): string {
  return normalizeOfmAnchorKey(value)
}

export function findOfmAnchorTarget<T extends OfmAnchorTargetLike>(
  root: OfmAnchorRootLike<T>,
  value: string | null | undefined
): T | undefined {
  const targetKey = normalizeOfmAnchorKey(value)

  if (!targetKey) {
    return undefined
  }

  for (const element of root.querySelectorAll('[data-anchor-key]')) {
    if (element.dataset?.anchorKey === targetKey) {
      return element
    }
  }

  return undefined
}

export function anchorHast(options: Partial<Pick<OfmRehypeOptions, 'renderBlockAnchorLabels'>> = {}): (node: Root | RootContent) => void {
  const renderBlockAnchorLabels = options.renderBlockAnchorLabels ?? false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    if (isHeadingElement(node)) {
      const anchorKey = normalizeOfmAnchorKey(extractTextContent(node))

      if (anchorKey) {
        node.properties['data-anchor-key'] = anchorKey
        setOfmPublicProps(node.properties, {kind: 'anchor-target', variant: 'heading'})
        addClassName(node.properties, ofmClassNames.anchorTarget, ofmClassNames.headingTarget)
      }
    }

    if (node.tagName === 'p' || node.tagName === 'li') {
      const blockId = stripTrailingBlockId(node)

      if (blockId) {
        node.properties['data-anchor-key'] = normalizeOfmAnchorKey(`^${blockId}`)
        setOfmPublicProps(node.properties, {kind: 'anchor-target', variant: 'block', blockId})
        addClassName(node.properties, ofmClassNames.anchorTarget, ofmClassNames.blockTarget)

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
