import type { Element, Root, RootContent, Text } from 'hast'

import type { OfmRehypeOptions } from '../types.js'
import {addClassName, ofmClassNames} from '../shared/class-name.js'
import {getOfmNodeData, stripOfmDataProps} from '../shared/ofm-node.js'
import {splitParagraphChildren} from '../shared/paragraph-split.js'
import {ofmPublicKind, ofmPublicVariant, readOfmPublicProps, setOfmPublicProps} from '../shared/public-props.js'
import {buildOfmTargetHref, formatOfmTargetLabel} from '../shared/ofm-url.js'
import {resolveOfmPath} from '../shared/resolve-ofm-path.js'

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])

export function embedHast(options: OfmRehypeOptions = {}): (node: Root | RootContent) => void {
  const setTitle = options.setTitle !== false

  return function transform(node) {
    if ('children' in node && Array.isArray(node.children)) {
      splitParagraphChildren(node, isNoteEmbedBlock)
    }

    if (node.type !== 'element') {
      return
    }

    const embed = getOfmNodeData(node.properties)

    if (embed?.kind !== ofmPublicKind.embed) {
      return
    }

    const resolvedEmbed = {
      ...embed,
      path: resolveOfmPath(embed.path, options)
    }
    const href = resolveTargetHref(resolvedEmbed, options)
    const title = formatOfmTargetLabel(resolvedEmbed)
    const publicProps = {
      kind: ofmPublicKind.embed,
      path: resolvedEmbed.path,
      ...(resolvedEmbed.alias === undefined ? {} : {alias: resolvedEmbed.alias}),
      ...(resolvedEmbed.fragment === undefined ? {} : {fragment: resolvedEmbed.fragment})
    }

    if (isImageEmbed(resolvedEmbed.path)) {
      node.tagName = 'img'
      node.properties.src = href
      node.properties.alt = embed.value
      if (resolvedEmbed.size?.width !== undefined) {
        node.properties.width = resolvedEmbed.size.width
      }
      if (resolvedEmbed.size?.height !== undefined) {
        node.properties.height = resolvedEmbed.size.height
      }
      node.children = []
      setOfmPublicProps(node.properties, {...publicProps, variant: ofmPublicVariant.image})
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      stripOfmDataProps(node.properties)
      return
    }

    if (isMarkdownEmbed(resolvedEmbed.path)) {
      node.tagName = 'div'
      node.children = [createFallbackLink(href, getFallbackLabel(resolvedEmbed))]
      setOfmPublicProps(node.properties, {...publicProps, variant: ofmPublicVariant.note})
      addClassName(node.properties, ofmClassNames.embed)
      applyTitle(node.properties, title, setTitle)
      stripOfmDataProps(node.properties)
      return
    }

    node.tagName = 'a'
    node.properties.href = href
    node.children = [{type: 'text', value: getFallbackLabel(resolvedEmbed)} satisfies Text]
    setOfmPublicProps(node.properties, {...publicProps, variant: ofmPublicVariant.file})
    addClassName(node.properties, ofmClassNames.embed)
    applyTitle(node.properties, title, setTitle)
    stripOfmDataProps(node.properties)
  }
}

function isNoteEmbedBlock(node: Element['children'][number]): boolean {
  if (node.type !== 'element' || node.tagName !== 'div') {
    return false
  }

  const props = readOfmPublicProps(node)
  return props?.kind === ofmPublicKind.embed && props.variant === ofmPublicVariant.note
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

function getFallbackLabel(node: {alias?: string | null, fragment?: string | null, path: string}): string {
  return node.alias || formatOfmTargetLabel(node)
}

function resolveTargetHref(
  target: {fragment?: string | null; path: string},
  options: OfmRehypeOptions
): string {
  return buildOfmTargetHref(target, options.hrefPrefix)
}
