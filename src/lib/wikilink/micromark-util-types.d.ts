import 'micromark-util-types'

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    ofmComment: 'ofmComment'
    ofmCommentMarker: 'ofmCommentMarker'
    ofmCommentValue: 'ofmCommentValue'
    highlight: 'highlight'
    highlightText: 'highlightText'
    ofmHighlightSequence: 'ofmHighlightSequence'
    ofmHighlightSequenceTemporary: 'ofmHighlightSequenceTemporary'
    ofmEmbed: 'ofmEmbed'
    ofmWikiLink: 'ofmWikiLink'
    ofmWikiMarker: 'ofmWikiMarker'
    ofmWikiValue: 'ofmWikiValue'
  }
}

export {}
