import type {Break, Parent, PhrasingContent, Root, Text} from 'mdast'

import type {RemarkTransform} from '../feature.js'

type PhrasingParent = Parent & {
  children: PhrasingContent[]
}

export function softBreakRemark(): RemarkTransform {
  return function transform(tree: Root) {
    visitPhrasingParents(tree)
  }
}

function visitPhrasingParents(node: Parent): void {
  if (isPhrasingParent(node)) {
    splitSoftBreaks(node)
  }

  for (const child of node.children) {
    if (isParent(child)) {
      visitPhrasingParents(child)
    }
  }
}

function splitSoftBreaks(parent: PhrasingParent): void {
  const children: PhrasingContent[] = []

  for (const child of parent.children) {
    if (child.type !== 'text' || !child.value.includes('\n')) {
      children.push(child)
      continue
    }

    children.push(...splitText(child))
  }

  parent.children = children
}

function splitText(node: Text): PhrasingContent[] {
  const values = node.value.split('\n')
  const children: PhrasingContent[] = []

  values.forEach((value, index) => {
    if (index > 0) {
      children.push(createBreak())
    }

    if (value.length > 0) {
      children.push(createText(node, value))
    }
  })

  return children
}

function createBreak(): Break {
  return {type: 'break'}
}

function createText(node: Text, value: string): Text {
  const {position: _position, ...text} = node
  return {...text, value}
}

function isParent(node: unknown): node is Parent {
  return typeof node === 'object'
    && node !== null
    && 'children' in node
    && Array.isArray(node.children)
}

function isPhrasingParent(node: Parent): node is PhrasingParent {
  return node.type === 'paragraph'
    || node.type === 'heading'
    || node.type === 'emphasis'
    || node.type === 'strong'
    || node.type === 'delete'
    || node.type === 'link'
    || node.type === 'linkReference'
    || node.type === 'highlight'
}
