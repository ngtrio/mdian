import type {Code, Construct, State, TokenizeContext, Tokenizer} from 'micromark-util-types'

const percentSign = '%'.charCodeAt(0)

export const commentTokenizer: Construct = {
  name: 'ofmComment',
  tokenize: tokenizeComment
}

export function tokenizeComment(this: TokenizeContext, effects: Parameters<Tokenizer>[0], ok: State, nok: State): State {
  return start

  function start(code: Code): State | undefined {
    if (code !== percentSign) {
      return nok(code)
    }

    effects.enter('ofmComment')
    effects.enter('ofmCommentMarker')
    effects.consume(code)
    return openSecond
  }

  function openSecond(code: Code): State | undefined {
    if (code !== percentSign) {
      effects.exit('ofmCommentMarker')
      effects.exit('ofmComment')
      return nok(code)
    }

    effects.consume(code)
    effects.exit('ofmCommentMarker')
    effects.enter('ofmCommentValue')
    return inside
  }

  function inside(code: Code): State | undefined {
    if (code === null) {
      return nok(code)
    }

    if (code === percentSign) {
      effects.consume(code)
      return closeSecond
    }

    effects.consume(code)
    return inside
  }

  function closeSecond(code: Code): State | undefined {
    if (code !== percentSign) {
      if (code === null) {
        return nok(code)
      }

      effects.consume(code)
      return inside
    }

    effects.exit('ofmCommentValue')
    effects.enter('ofmCommentMarker')
    effects.consume(code)
    effects.exit('ofmCommentMarker')
    effects.exit('ofmComment')
    return ok
  }
}
