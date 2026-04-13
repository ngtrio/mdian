import type {Code, Construct, Effects, State, TokenizeContext} from 'micromark-util-types'

const leftSquareBracket = '['.charCodeAt(0)
const rightSquareBracket = ']'.charCodeAt(0)
const backslash = '\\'.charCodeAt(0)
const carriageReturn = '\r'.charCodeAt(0)
const lineFeed = '\n'.charCodeAt(0)

export const wikiLinkTokenizer: Construct = {
  name: 'ofmWikiLink',
  tokenize: tokenizeWikiLink
}

export function tokenizeWikiLink(this: TokenizeContext, effects: Effects, ok: State, nok: State): State {
  let escaped = false

  return start

  function start(code: Code): State | undefined {
    effects.enter('ofmWikiLink')
    return openFirst(code)
  }

  function openFirst(code: Code): State | undefined {
    if (code !== leftSquareBracket) {
      effects.exit('ofmWikiLink')
      return nok(code)
    }

    effects.enter('ofmWikiMarker')
    effects.consume(code)
    return openSecond
  }

  function openSecond(code: Code): State | undefined {
    if (code !== leftSquareBracket) {
      effects.exit('ofmWikiMarker')
      effects.exit('ofmWikiLink')
      return nok(code)
    }

    effects.consume(code)
    effects.exit('ofmWikiMarker')
    effects.enter('ofmWikiValue')
    return inside
  }

  function inside(code: Code): State | undefined {
    if (code === null || code === lineFeed || code === carriageReturn) {
      return nok(code)
    }

    if (escaped) {
      escaped = false
      effects.consume(code)
      return inside
    }

    if (code === backslash) {
      escaped = true
      effects.consume(code)
      return inside
    }

    if (code === rightSquareBracket) {
      effects.exit('ofmWikiValue')
      effects.enter('ofmWikiMarker')
      effects.consume(code)
      return closeSecond
    }

    effects.consume(code)
    return inside
  }

  function closeSecond(code: Code): State | undefined {
    if (code !== rightSquareBracket) {
      return nok(code)
    }

    effects.consume(code)
    effects.exit('ofmWikiMarker')
    effects.exit('ofmWikiLink')
    return ok
  }
}