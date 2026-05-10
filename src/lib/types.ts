export interface OfmRemarkOptions {
  callouts?: boolean
  comments?: boolean
  embeds?: boolean
  highlights?: boolean
  wikilinks?: boolean
}

export interface OfmRehypeOptions {
  externalEmbeds?: boolean
  renderBlockAnchorLabels?: boolean
  resolveHref?: (href: string) => string
  resolvePathCandidates?: (path: string) => readonly string[]
  setTitle?: boolean
}
