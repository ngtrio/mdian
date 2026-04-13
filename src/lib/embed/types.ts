import type { Literal } from "mdast"
import type { WikiLink } from "../wikilink/types.js"

export interface EmbedData {
    alias?: string | null | undefined
    blockId?: string | null | undefined
    kind: 'embed'
    path: string
    permalink: string
    value: string
}

export interface Embed extends Literal {
    type: 'embed'
    alias?: string | null | undefined
    blockId?: string | null | undefined
    path: string
    permalink: string
    value: string
}
