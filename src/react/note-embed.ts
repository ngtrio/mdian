import {createContext, createElement, useContext} from 'react'
import type {ReactNode} from 'react'

import {formatOfmTargetLabel, isOfmBlockFragment, normalizeOfmFragmentAnchorKey} from '../lib/shared/ofm-url.js'
import type {OfmInternalTarget, ResolveOfmNoteEmbedResult} from './types.js'

export interface OfmNoteEmbedState {
  depth: number
}

export interface GuardOfmNoteEmbedInput {
  maxDepth?: number
  state: OfmNoteEmbedState
}

export interface GuardOfmNoteEmbedResult {
  allowRender: boolean
  isTooDeep: boolean
  nextState: OfmNoteEmbedState
}

export interface ResolveOfmNoteEmbedBodyInput {
  markdown: string
  target: OfmInternalTarget
}

export interface ResolveOfmNoteEmbedBodyResult {
  kind: 'block' | 'document' | 'heading'
  markdown: string
}

export interface RenderOfmNoteEmbedInput {
  className?: string
  fallbackHref?: string
  fallbackLabel: string
  maxDepth?: number
  renderBody: (markdown: string) => ReactNode
  resolved: ResolveOfmNoteEmbedResult
  target: OfmInternalTarget
}

const noteEmbedStateContext = createContext<OfmNoteEmbedState>({depth: 0})

export function guardOfmNoteEmbed(input: GuardOfmNoteEmbedInput): GuardOfmNoteEmbedResult {
  const maxDepth = input.maxDepth ?? 5
  const isTooDeep = input.state.depth >= maxDepth

  return {
    allowRender: !isTooDeep,
    isTooDeep,
    nextState: {
      depth: input.state.depth + 1
    }
  }
}

export function resolveOfmNoteEmbedBody(input: ResolveOfmNoteEmbedBodyInput): ResolveOfmNoteEmbedBodyResult {
  const blockId = getBlockIdFromFragment(input.target.fragment)

  if (blockId) {
    const blockMarkdown = extractBlockMarkdown(input.markdown, blockId)
    if (blockMarkdown) {
      return {kind: 'block', markdown: blockMarkdown}
    }
  }

  if (input.target.fragment) {
    const headingMarkdown = extractHeadingSection(input.markdown, input.target.fragment)
    if (headingMarkdown) {
      return {kind: 'heading', markdown: headingMarkdown}
    }
  }

  return {
    kind: 'document',
    markdown: stripRootHeadingFromMarkdown(input.markdown)
  }
}

export function renderOfmNoteEmbed(input: RenderOfmNoteEmbedInput) {
  return createElement(OfmNoteEmbed, input)
}

function OfmNoteEmbed(input: RenderOfmNoteEmbedInput) {
  const inheritedState = useContext(noteEmbedStateContext)
  const guard = guardOfmNoteEmbed({
    state: inheritedState,
    ...(input.maxDepth === undefined ? {} : {maxDepth: input.maxDepth})
  })

  if (!guard.allowRender) {
    return createElement('a', {href: input.fallbackHref}, input.fallbackLabel)
  }

  const body = resolveOfmNoteEmbedBody({
    markdown: input.resolved.markdown,
    target: input.target
  })
  const titleBase = input.resolved.title ?? input.target.path
  const embedTitle = body.kind === 'document'
    ? titleBase
    : formatOfmTargetLabel({
        path: titleBase,
        ...(input.target.fragment === undefined ? {} : {fragment: input.target.fragment})
      })

  return createElement(
    noteEmbedStateContext.Provider,
    {value: guard.nextState},
    createElement(
      'section',
      {className: `${input.className ?? ''} note-embed`.trim()},
      createElement(
        'header',
        {className: 'note-embed__header'},
        createElement('strong', undefined, embedTitle)
      ),
      createElement(
        'div',
        {className: 'note-embed__body'},
        input.renderBody(body.markdown)
      )
    )
  )
}

function stripRootHeadingFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n')

  if (!lines[0]?.startsWith('# ')) {
    return markdown
  }

  let index = 1
  while (index < lines.length && lines[index] === '') {
    index += 1
  }

  return lines.slice(index).join('\n')
}

function extractHeadingSection(markdown: string, heading: string): string | undefined {
  const lines = markdown.split('\n')
  const headings = collectMarkdownHeadings(lines)
  const normalizedHeading = normalizeOfmFragmentAnchorKey(heading)
  const targetHeading = headings.find((entry) => entry.pathKey === normalizedHeading)
    ?? headings.find((entry) => entry.titleKey === normalizedHeading)

  if (!targetHeading) {
    return undefined
  }

  let end = lines.length
  for (let index = targetHeading.index + 1; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+/.exec(lines[index] ?? '')
    if (match && match[1] !== undefined && match[1].length <= targetHeading.level) {
      end = index
      break
    }
  }

  return lines.slice(targetHeading.index, end).join('\n').trim()
}

function extractBlockMarkdown(markdown: string, blockId: string): string | undefined {
  const lines = markdown.split('\n')
  const matcher = new RegExp(`\\^(?:${escapeRegExp(blockId)})\\s*$`)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line === undefined || !matcher.test(line)) {
      continue
    }

    let start = index

    while (start > 0 && lines[start - 1] !== '') {
      start -= 1
    }

    let end = index + 1

    while (end < lines.length && lines[end] !== '') {
      end += 1
    }

    return lines.slice(start, end).join('\n').trim()
  }

  return undefined
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getBlockIdFromFragment(fragment: string | undefined): string | undefined {
  if (!isOfmBlockFragment(fragment)) {
    return undefined
  }

  const normalizedFragment = fragment?.trim()
  return normalizedFragment ? normalizedFragment.slice(1) : undefined
}

function collectMarkdownHeadings(lines: string[]) {
  const pathKeys: string[] = []
  const headings: Array<{
    index: number
    level: number
    pathKey: string
    titleKey: string
  }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(#{1,6})\s+(.*)$/.exec(lines[index] ?? '')

    if (!match || match[1] === undefined || match[2] === undefined) {
      continue
    }

    const level = match[1].length
    const titleKey = normalizeOfmFragmentAnchorKey(match[2])

    if (!titleKey) {
      continue
    }

    const pathKey = buildHeadingPathKey(level, titleKey, pathKeys)
    headings.push({index, level, pathKey, titleKey})
  }

  return headings
}

function buildHeadingPathKey(level: number, titleKey: string, pathKeys: string[]): string {
  if (level <= 1) {
    pathKeys.length = 0
    return titleKey
  }

  const hierarchyIndex = level - 2
  pathKeys.length = hierarchyIndex
  const parentKey = pathKeys[hierarchyIndex - 1]
  const pathKey = parentKey ? `${parentKey}#${titleKey}` : titleKey
  pathKeys[hierarchyIndex] = pathKey
  return pathKey
}
