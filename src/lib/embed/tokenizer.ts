import type {Code, Construct, State, TokenizeContext, Tokenizer} from 'micromark-util-types'

const leftSquareBracket = '['.charCodeAt(0)
const rightSquareBracket = ']'.charCodeAt(0)
const exclamationMark = '!'.charCodeAt(0)
const backslash = '\\'.charCodeAt(0)
const carriageReturn = '\r'.charCodeAt(0)
const lineFeed = '\n'.charCodeAt(0)

export const embedTokenizer: Construct = {
  name: 'ofmEmbed',
  tokenize: tokenizeEmbed
}

export function tokenizeEmbed(this: TokenizeContext, effects: Parameters<Tokenizer>[0], ok: State, nok: State): State {
  let escaped = false

  return start

  function start(code: Code): State | undefined {
    if (code !== exclamationMark) {
      return nok(code)
    }

    effects.enter('ofmEmbed')
    effects.consume(code)
    return openFirst
  }

  function openFirst(code: Code): State | undefined {
    if (code !== leftSquareBracket) {
      effects.exit('ofmEmbed')
      return nok(code)
    }

    effects.enter('ofmWikiMarker')
    effects.consume(code)
    return openSecond
  }

  function openSecond(code: Code): State | undefined {
    if (code !== leftSquareBracket) {
      effects.exit('ofmWikiMarker')
      effects.exit('ofmEmbed')
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
    effects.exit('ofmEmbed')
    return ok
  }
}
