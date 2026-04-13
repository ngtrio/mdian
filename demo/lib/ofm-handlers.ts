interface OfmNode {
  alias?: string
  blockId?: string
  path?: string
  permalink?: string
  value?: string
}

interface HandlerState {
  all: (node: unknown) => unknown[]
}

interface HandlerDefinition {
  (state: HandlerState, node: unknown): unknown
}

const embedHandler: HandlerDefinition = (_state, node) => {
  const ofmNode = node as OfmNode

  return {
    type: 'element',
    tagName: 'div',
    properties: {
      dataOfmKind: 'embed',
      dataOfmPath: ofmNode.path ?? '',
      dataOfmPermalink: ofmNode.permalink ?? '',
      dataOfmAlias: ofmNode.alias ?? '',
      dataOfmBlockId: ofmNode.blockId ?? '',
      dataOfmValue: ofmNode.value ?? ''
    },
    children: []
  }
}

const highlightHandler: HandlerDefinition = (state, node) => ({
  type: 'element',
  tagName: 'mark',
  properties: {
    dataOfmKind: 'highlight'
  },
  children: state.all(node)
})

export const ofmHandlers: Record<string, HandlerDefinition> = {
  embed: embedHandler,
  highlight: highlightHandler
}
