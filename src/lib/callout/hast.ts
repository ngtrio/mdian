import type {Element, ElementContent, Properties, RootContent, Text} from 'hast'

import {addClassName, ofmClassNames} from '../class-name.js'
import {clearOfmDataProps} from '../ofm-node.js'

export function calloutHast() {
  return function transform(node: RootContent | {type: 'root', children: RootContent[]}): void {
    if (!isElement(node)) {
      return
    }

    if (node.tagName !== 'div' || node.properties.dataOfmKind !== 'callout') {
      return
    }

    const calloutType = typeof node.properties.dataOfmCalloutType === 'string'
      ? node.properties.dataOfmCalloutType
      : ''
    const title = typeof node.properties.dataOfmTitle === 'string'
      ? node.properties.dataOfmTitle
      : ''
    const foldable = node.properties.dataOfmFoldable === true || node.properties.dataOfmFoldable === ''
    const collapsed = node.properties.dataOfmCollapsed === true || node.properties.dataOfmCollapsed === ''
    const contentChildren = [...node.children]

    const properties: Properties = {
      ...node.properties,
      'data-ofm-callout': calloutType,
      ...(foldable ? {'data-ofm-foldable': ''} : {}),
      ...(collapsed ? {'data-ofm-collapsed': ''} : {})
    }

    clearOfmDataProps(properties)
    addClassName(properties, ofmClassNames.callout)

    node.tagName = foldable ? 'details' : 'div'
    node.properties = properties
    node.children = [
      createSection(foldable ? 'summary' : 'div', ofmClassNames.calloutTitle, title),
      {
        type: 'element',
        tagName: 'div',
        properties: {className: [ofmClassNames.calloutContent]},
        children: contentChildren
      }
    ]

    if (foldable) {
      if (!collapsed) {
        node.properties.open = true
      } else {
        delete node.properties.open
      }
    }
  }
}

function createSection(tagName: 'div' | 'summary', className: string, value: string): Element {
  const children: ElementContent[] = value.length === 0 ? [] : [{type: 'text', value} as Text]

  return {
    type: 'element',
    tagName,
    properties: {className: [className]},
    children
  }
}

function isElement(node: unknown): node is Element {
  return Boolean(
    node
    && typeof node === 'object'
    && 'type' in node
    && node.type === 'element'
    && 'tagName' in node
    && 'properties' in node
    && 'children' in node
  )
}
