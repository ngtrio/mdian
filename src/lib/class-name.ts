import type {Properties} from 'hast'

export const ofmClassNames = {
  anchorTarget: 'ofm-anchor-target',
  blockAnchorLabel: 'ofm-block-anchor-label',
  blockTarget: 'ofm-block-target',
  embed: 'ofm-embed',
  headingTarget: 'ofm-heading-target',
  highlight: 'ofm-highlight',
  wikilink: 'ofm-wikilink'
} as const

export type OfmClassName = (typeof ofmClassNames)[keyof typeof ofmClassNames]

export function addClassName(
  properties: Properties | Record<string, unknown> | undefined,
  ...classNames: Array<OfmClassName | string>
): void {
  if (!properties) {
    return
  }

  const nextClassNames = new Set<string>()
  const currentClassName = properties.className

  const addTokens = (value: string): void => {
    for (const token of value.split(/\s+/)) {
      if (token.length > 0) {
        nextClassNames.add(token)
      }
    }
  }

  if (Array.isArray(currentClassName)) {
    for (const value of currentClassName) {
      if (typeof value === 'string' && value.length > 0) {
        addTokens(value)
      }
    }
  } else if (typeof currentClassName === 'string' && currentClassName.length > 0) {
    addTokens(currentClassName)
  }

  for (const className of classNames) {
    if (className.length > 0) {
      nextClassNames.add(className)
    }
  }

  if (nextClassNames.size > 0) {
    properties.className = [...nextClassNames]
  }
}
