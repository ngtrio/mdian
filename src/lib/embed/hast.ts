import type { Element, Root, RootContent, Text } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import {addClassName, ofmClassNames} from '../class-name.js'
import { clearOfmDataProps, getOfmNodeData } from '../ofm-node.js'
import { buildOfmTargetUrl, decodeOfmFragment } from '../ofm-url.js'

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
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      clearOfmDataProps(node.properties)
      return
    }

    if (isMarkdownEmbed(embed.path)) {
      const fragment = getPermalinkFragment(embed.permalink)

      node.tagName = 'div'
      node.properties['data-ofm-embed'] = 'note'
      node.properties['data-ofm-path-public'] = embed.path
      node.properties['data-ofm-permalink-public'] = embed.permalink

      if (embed.alias) {
        node.properties['data-ofm-alias-public'] = embed.alias
      }

      if (fragment) {
        node.properties['data-ofm-fragment-public'] = fragment
      }

      if (embed.blockId) {
        node.properties['data-ofm-block-id-public'] = embed.blockId
      }

      node.children = [createFallbackLink(href, getFallbackLabel(embed))]
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      clearOfmDataProps(node.properties)
      return
    }

    node.tagName = 'a'
    node.properties.href = href
    node.children = [{type: 'text', value: getFallbackLabel(embed)} satisfies Text]
    addClassName(node.properties, ofmClassNames.embed)
    applyTitle(node.properties, title, setTitle)
    clearOfmDataProps(node.properties)
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

function getPermalinkFragment(permalink: string): string | undefined {
  const hashIndex = permalink.indexOf('#')

  if (hashIndex === -1) {
    return undefined
  }

  const fragment = decodeOfmFragment(permalink.slice(hashIndex))
  return fragment.length > 0 ? fragment : undefined
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
