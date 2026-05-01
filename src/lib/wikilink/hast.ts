import type {Root, RootContent} from 'hast'

import type {OfmRehypeOptions} from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {ofmPublicKind, setOfmPublicProps} from '../shared/public-props.js'
import {buildOfmTargetHref, formatOfmTargetLabel} from '../shared/ofm-url.js'
import {resolveOfmPath} from '../shared/resolve-ofm-path.js'

export function wikiLinkHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const ofmNode = getOfmNodeData(node.properties)

    if (ofmNode?.kind !== ofmPublicKind.wikilink) {
      return
    }

    const resolvedTarget = {
      ...ofmNode,
      path: resolveOfmPath(ofmNode.path, options)
    }

    node.properties.href = resolveTargetHref(resolvedTarget, options)
    setOfmPublicProps(node.properties, {
      kind: ofmPublicKind.wikilink,
      path: resolvedTarget.path,
      ...(resolvedTarget.alias === undefined ? {} : {alias: resolvedTarget.alias}),
      ...(resolvedTarget.fragment === undefined ? {} : {fragment: resolvedTarget.fragment})
    })
    addClassName(node.properties, ofmClassNames.wikilink)

    if (setTitle) {
      node.properties.title = formatOfmTargetLabel(resolvedTarget)
    } else {
      delete node.properties.title
    }

    stripOfmDataProps(node.properties)
  }
}

function resolveTargetHref(
  target: {fragment?: string | null; path: string},
  options: OfmRehypeOptions
): string {
  return buildOfmTargetHref(target, options.hrefPrefix)
}
