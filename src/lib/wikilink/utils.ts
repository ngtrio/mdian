import type {WikiLink} from '../types.js'

export function parseWikiValue(value: string): Pick<WikiLink, 'alias' | 'blockId' | 'path' | 'permalink'> {
  const pipeIndex = value.indexOf('|')
  const permalink = pipeIndex === -1 ? value : value.slice(0, pipeIndex)
  const alias = pipeIndex === -1 ? undefined : value.slice(pipeIndex + 1)

  const hashIndex = permalink.indexOf('#')
  const path = hashIndex === -1 ? permalink : permalink.slice(0, hashIndex)
  const anchor = hashIndex === -1 ? undefined : permalink.slice(hashIndex + 1)
  const blockId = anchor?.startsWith('^') ? anchor.slice(1) : undefined

  return {alias, blockId, path, permalink}
}
