import type {Element, ElementContent, Properties, RootContent, Text} from 'hast'

import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {setOfmPublicProps} from '../shared/public-props.js'

export function calloutHast() {
  return function transform(node: RootContent | {type: 'root', children: RootContent[]}): void {
    if (!isElement(node)) {
      return
    }

    const ofmNode = getOfmNodeData(node.properties)

    if (node.tagName !== 'div' || ofmNode?.kind !== 'callout') {
      return
    }

    const contentChildren = [...node.children]

    const properties: Properties = {
      ...node.properties,
      'data-ofm-callout': ofmNode.calloutType,
      ...(ofmNode.foldable ? {'data-ofm-foldable': ''} : {}),
      ...(ofmNode.collapsed ? {'data-ofm-collapsed': ''} : {})
    }

    setOfmPublicProps(properties, {kind: 'callout'})
    stripOfmDataProps(properties)
    addClassName(properties, ofmClassNames.callout)

    node.tagName = ofmNode.foldable ? 'details' : 'div'
    node.properties = properties
    node.children = [
      createSection(ofmNode.foldable ? 'summary' : 'div', ofmClassNames.calloutTitle, ofmNode.title),
      {
        type: 'element',
        tagName: 'div',
        properties: {className: [ofmClassNames.calloutContent]},
        children: contentChildren
      }
    ]

    if (ofmNode.foldable) {
      if (!ofmNode.collapsed) {
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
