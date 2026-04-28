import {createContext, createElement, type ReactNode, useContext} from 'react'

import {decodeOfmFragment} from 'mdian'

export interface OfmNoteEmbedState {
  depth: number
}

export interface OfmNoteEmbedGuardInput {
  state: OfmNoteEmbedState
  maxDepth?: number
}

export interface OfmNoteEmbedGuardResult {
  allowRender: boolean
  isTooDeep: boolean
  nextState: OfmNoteEmbedState
}

export interface ResolveOfmNoteEmbedContentInput {
  markdown: string
  permalink?: string
  stripRootHeading?: boolean
}

export interface ResolveOfmNoteEmbedContentResult {
  markdown: string
  fragment?: string
  kind: 'document' | 'heading' | 'block'
}

export interface OfmNoteEmbedPage {
  markdown: string
  title: string
}

export interface OfmNoteEmbedTarget {
  href?: string
  path: string
  permalink: string
  title?: string
}

export interface OfmNoteEmbedFallbackProps {
  label: string
  target: OfmNoteEmbedTarget
}

export interface OfmNoteEmbedBodyProps {
  markdown: string
  state: OfmNoteEmbedState
}

export interface OfmNoteEmbedOptions {
  maxDepth?: number
  stripRootHeading?: boolean
}

export interface OfmNoteEmbedProps {
  className?: string
  options?: OfmNoteEmbedOptions
  renderBody: (props: OfmNoteEmbedBodyProps) => ReactNode
  renderFallback?: (props: OfmNoteEmbedFallbackProps) => ReactNode
  resolvePage: (path: string) => OfmNoteEmbedPage | undefined
  target: OfmNoteEmbedTarget
}

const ofmNoteEmbedStateContext = createContext<OfmNoteEmbedState>({depth: 0})

export function guardOfmNoteEmbed(input: OfmNoteEmbedGuardInput): OfmNoteEmbedGuardResult {
  const {state} = input
  const maxDepth = input.maxDepth ?? 2
  const isTooDeep = state.depth >= maxDepth

  return {
    allowRender: !isTooDeep,
    isTooDeep,
    nextState: {
      depth: state.depth + 1
    }
  }
}

export function resolveOfmNoteEmbedContent(
  input: ResolveOfmNoteEmbedContentInput
): ResolveOfmNoteEmbedContentResult {
  const {markdown, stripRootHeading = true} = input
  const fragment = extractFragment(input.permalink)
  const documentMarkdown = stripRootHeading ? stripRootHeadingFromMarkdown(markdown) : markdown

  if (!fragment) {
    return {
      kind: 'document',
      markdown: documentMarkdown
    }
  }

  if (fragment.startsWith('^')) {
    const blockMarkdown = extractBlockMarkdown(markdown, fragment.slice(1))

    if (blockMarkdown) {
      return {
        fragment,
        kind: 'block',
        markdown: blockMarkdown
      }
    }
  }

  const sectionMarkdown = extractHeadingSection(markdown, fragment)

  if (sectionMarkdown) {
    return {
      fragment,
      kind: 'heading',
      markdown: sectionMarkdown
    }
  }

  return {
    fragment,
    kind: 'document',
    markdown: documentMarkdown
  }
}

export function OfmNoteEmbed({
  className,
  options,
  renderBody,
  renderFallback,
  resolvePage,
  target
}: OfmNoteEmbedProps) {
  const inheritedState = useContext(ofmNoteEmbedStateContext)
  const guard = guardOfmNoteEmbed({
    state: inheritedState,
    ...(options?.maxDepth === undefined ? {} : {maxDepth: options.maxDepth})
  })
  const page = resolvePage(target.path)
  const fallbackLabel = target.title || target.permalink || target.path

  if (!page || !guard.allowRender) {
    return createElement(
      'div',
      {className},
      renderFallback
        ? renderFallback({
            label: fallbackLabel,
            target
          })
        : createElement('a', {href: target.href}, fallbackLabel)
    )
  }

  const embed = resolveOfmNoteEmbedContent({
    markdown: page.markdown,
    permalink: target.permalink,
    ...(options?.stripRootHeading === undefined ? {} : {stripRootHeading: options.stripRootHeading})
  })
  const embedTitle = embed.kind === 'document' ? page.title : `${page.title}#${embed.fragment}`

  return createElement(
    ofmNoteEmbedStateContext.Provider,
    {value: guard.nextState},
    createElement(
      'section',
      {className: `${className ?? ''} note-embed`.trim()},
      createElement(
        'header',
        {className: 'note-embed__header'},
        createElement('strong', undefined, embedTitle)
      ),
      createElement(
        'div',
        {className: 'note-embed__body'},
        renderBody({markdown: embed.markdown, state: guard.nextState})
      )
    )
  )
}

function extractFragment(permalink?: string): string {
  if (!permalink) {
    return ''
  }

  const hashIndex = permalink.indexOf('#')
  return hashIndex === -1 ? '' : decodeOfmFragment(permalink.slice(hashIndex))
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
  const normalizedHeading = heading.trim().toLowerCase()
  let start = -1
  let level = 0

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (line === undefined) {
      continue
    }

    const match = /^(#{1,6})\s+(.*)$/.exec(line)

    if (!match) {
      continue
    }

    const hashes = match[1]
    const title = match[2]

    if (hashes === undefined || title === undefined) {
      continue
    }

    const currentHeading = title.trim().toLowerCase()

    if (currentHeading === normalizedHeading) {
      start = index
      level = hashes.length
      break
    }
  }

  if (start === -1) {
    return undefined
  }

  let end = lines.length

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]

    if (line === undefined) {
      continue
    }

    const match = /^(#{1,6})\s+/.exec(line)

    if (match && match[1] !== undefined && match[1].length <= level) {
      end = index
      break
    }
  }

  return lines.slice(start, end).join('\n').trim()
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
