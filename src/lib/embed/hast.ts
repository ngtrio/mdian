import type { Element, Root, RootContent, Text } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {setOfmPublicProps, getOfmPublicFragment} from '../shared/public-props.js'
import { buildOfmTargetUrl } from '../shared/ofm-url.js'

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])

export function embedHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if (node.type !== 'element') {
      return
    }

    const embed = getOfmNodeData(node.properties)

    if (embed?.kind !== 'embed') {
      return
    }

    const href = buildOfmTargetUrl(embed, options.hrefPrefix)
    const title = embed.permalink || embed.path
    const fragment = getOfmPublicFragment(embed.permalink)
    const publicProps = {
      kind: 'embed' as const,
      path: embed.path,
      permalink: embed.permalink,
      ...(embed.alias === undefined ? {} : {alias: embed.alias}),
      ...(embed.blockId === undefined ? {} : {blockId: embed.blockId}),
      ...(fragment === undefined ? {} : {fragment})
    }

    if (isImageEmbed(embed.path)) {
      node.tagName = 'img'
      node.properties.src = href
      node.properties.alt = embed.value
      if (embed.size?.width !== undefined) {
        node.properties.width = embed.size.width
      }
      if (embed.size?.height !== undefined) {
        node.properties.height = embed.size.height
      }
      node.children = []
      setOfmPublicProps(node.properties, {...publicProps, variant: 'image'})
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      stripOfmDataProps(node.properties)
      return
    }

    if (isMarkdownEmbed(embed.path)) {
      node.tagName = 'div'
      node.children = [createFallbackLink(href, getFallbackLabel(embed))]
      setOfmPublicProps(node.properties, {...publicProps, variant: 'note'})
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      stripOfmDataProps(node.properties)
      return
    }

    node.tagName = 'a'
    node.properties.href = href
    node.children = [{type: 'text', value: getFallbackLabel(embed)} satisfies Text]
    setOfmPublicProps(node.properties, {...publicProps, variant: 'file'})
    addClassName(node.properties, ofmClassNames.embed)
    applyTitle(node.properties, title, setTitle)
    stripOfmDataProps(node.properties)
  }
}

function isImageEmbed(path: string): boolean {
  const extension = getPathExtension(path)
  return extension !== undefined && imageExtensions.has(extension)
}

function isMarkdownEmbed(path: string): boolean {
  const extension = getPathExtension(path)
  return extension === undefined || extension === '.md'
}

function getPathExtension(path: string): string | undefined {
  const fileName = path.split('/').pop()?.trim()

  if (!fileName || fileName.startsWith('.') || !fileName.includes('.')) {
    return undefined
  }

  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
}

function createFallbackLink(href: string, label: string): Element {
  return {
    type: 'element',
    tagName: 'a',
    properties: {href},
    children: [{type: 'text', value: label}]
  }
}

function applyTitle(properties: Record<string, unknown>, title: string, setTitle: boolean): void {
  if (setTitle) {
    properties.title = title
  } else {
    delete properties.title
  }
}

function getFallbackLabel(node: {alias?: string | null | undefined, path: string, permalink: string}): string {
  return node.alias || node.permalink || node.path
}
