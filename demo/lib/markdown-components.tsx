import {createElement, type ComponentPropsWithoutRef} from 'react'
import {Link} from '@tanstack/react-router'
import {type Components} from 'react-markdown'

export function createMarkdownComponents(): Components {
  return {
    a({className, ...props}) {
      const anchorProps = stripInternalProps(props as Record<string, unknown>) as ComponentPropsWithoutRef<'a'>
      const isWikiLink = typeof anchorProps.href === 'string' && anchorProps.href.startsWith('/wiki/')
      const nextClassName = [className, isWikiLink ? 'wiki-link' : null].filter(Boolean).join(' ')

      if (!isWikiLink || typeof anchorProps.href !== 'string') {
        return <a {...anchorProps} className={nextClassName} />
      }

      const {href, ...linkProps} = anchorProps

      return <Link {...linkProps} className={nextClassName} to={href} />
    },
    mark({className, ...props}) {
      const markProps = stripInternalProps(props as Record<string, unknown>) as ComponentPropsWithoutRef<'mark'>

      return <mark {...markProps} className={[className, 'ofm-highlight'].filter(Boolean).join(' ')} />
    },
    li: (props) => renderListItem(props),
    p: (props) => renderParagraph(props)
  }
}

function readStringProp(node: {properties?: Record<string, unknown>} | undefined, key: string): string {
  const value = node?.properties?.[key]
  return typeof value === 'string' ? value : ''
}

function readBlockId(node: {properties?: Record<string, unknown>} | undefined): string {
  const anchorKey = readStringProp(node, 'data-anchor-key')
  return anchorKey.startsWith('^') ? anchorKey.slice(1) : ''
}

function renderListItem({
  node,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'li'> & {node?: {properties?: Record<string, unknown>}}) {
  const blockId = readBlockId(node)
  return renderBlockTarget('li', props, children, className, blockId)
}

function renderParagraph({
  node,
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<'p'> & {node?: {properties?: Record<string, unknown>}}) {
  const blockId = readBlockId(node)
  return renderBlockTarget('p', props, children, className, blockId)
}

function renderBlockTarget(
  tagName: 'li' | 'p',
  props: Record<string, unknown>,
  children: ComponentPropsWithoutRef<'p'>['children'],
  className: string | undefined,
  blockId: string
) {
  const nextClassName = [className, blockId ? 'block-target' : null].filter(Boolean).join(' ')

  return createElement(
    tagName,
    {
      ...props,
      className: nextClassName || undefined
    },
    blockId
      ? [
          children,
          <span className="block-anchor-label" key={`block-anchor-${blockId}`}>
            ^{blockId}
          </span>
        ]
      : children
    )
}

function stripInternalProps(props: Record<string, unknown>): Record<string, unknown> {
  const {
    dataOfmAlias: _alias,
    dataOfmBlockId: _blockId,
    dataOfmKind: _kind,
    dataOfmPath: _path,
    dataOfmPermalink: _permalink,
    dataOfmValue: _value,
    'data-ofm-alias': _dataAlias,
    'data-ofm-block-id': _dataBlockId,
    'data-ofm-kind': _dataKind,
    'data-ofm-path': _dataPath,
    'data-ofm-permalink': _dataPermalink,
    'data-ofm-value': _dataValue,
    ...rest
  } = props

  return rest
}
