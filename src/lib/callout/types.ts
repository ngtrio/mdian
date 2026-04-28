import type {Parent, RootContent} from 'mdast'
import type {Properties} from 'hast'

export interface Callout extends Parent {
  type: 'callout'
  calloutType: string
  title: string
  foldable: boolean
  collapsed: boolean
  data?: {
    hName: 'div'
    hProperties: Properties
  }
  children: RootContent[]
}

declare module 'mdast' {
  interface RootContentMap {
    callout: Callout
  }

  interface BlockContentMap {
    callout: Callout
  }
}
