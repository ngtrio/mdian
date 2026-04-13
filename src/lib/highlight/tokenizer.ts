import type {Code, Construct, Event, State, Token, TokenizeContext, Tokenizer} from 'micromark-util-types'

import {splice} from 'micromark-util-chunked'
import {classifyCharacter} from 'micromark-util-classify-character'
import {resolveAll} from 'micromark-util-resolve-all'
import {codes, constants, types} from 'micromark-util-symbol'

export const highlightTokenizer: Construct = {
  name: 'ofmHighlight',
  tokenize: tokenizeHighlight,
  resolveAll: resolveAllHighlight
}

function resolveAllHighlight(events: Event[], context: TokenizeContext): Event[] {
  let index = -1

  while (++index < events.length) {
    const closeEvent = events[index]

    if (
      closeEvent &&
      closeEvent[0] === 'enter' &&
      closeEvent[1].type === 'ofmHighlightSequenceTemporary' &&
      closeEvent[1]._close
    ) {
      let open = index

      while (open--) {
        const openEvent = events[open]

        if (
          openEvent &&
          openEvent[0] === 'exit' &&
          openEvent[1].type === 'ofmHighlightSequenceTemporary' &&
          openEvent[1]._open &&
          closeEvent[1].end.offset - closeEvent[1].start.offset ===
            openEvent[1].end.offset - openEvent[1].start.offset
        ) {
          closeEvent[1].type = 'ofmHighlightSequence'
          openEvent[1].type = 'ofmHighlightSequence'

          const highlight: Token = {
            type: 'highlight',
            start: Object.assign({}, openEvent[1].start),
            end: Object.assign({}, closeEvent[1].end)
          }

          const highlightText: Token = {
            type: 'highlightText',
            start: Object.assign({}, openEvent[1].end),
            end: Object.assign({}, closeEvent[1].start)
          }

          const nextEvents: Event[] = [
            ['enter', highlight, context],
            ['enter', openEvent[1], context],
            ['exit', openEvent[1], context],
            ['enter', highlightText, context]
          ]

          const insideSpan = context.parser.constructs.insideSpan.null

          if (insideSpan) {
            splice(
              nextEvents,
              nextEvents.length,
              0,
              resolveAll(insideSpan, events.slice(open + 1, index), context)
            )
          }

          splice(nextEvents, nextEvents.length, 0, [
            ['exit', highlightText, context],
            ['enter', closeEvent[1], context],
            ['exit', closeEvent[1], context],
            ['exit', highlight, context]
          ])

          splice(events, open - 1, index - open + 3, nextEvents)
          index = open + nextEvents.length - 2
          break
        }
      }
    }
  }

  index = -1

  while (++index < events.length) {
    const event = events[index]

    if (event && event[1].type === 'ofmHighlightSequenceTemporary') {
      event[1].type = types.data
    }
  }

  return events
}

export function tokenizeHighlight(this: TokenizeContext, effects: Parameters<Tokenizer>[0], ok: State, nok: State): State {
  const previous = this.previous
  const events = this.events
  let size = 0

  return start

  function start(code: Code): State | undefined {
    if (
      previous === codes.equalsTo &&
      events[events.length - 1]?.[1].type !== types.characterEscape
    ) {
      return nok(code)
    }

    effects.enter('ofmHighlightSequenceTemporary')
    return more(code)
  }

  function more(code: Code): State | undefined {
    const before = classifyCharacter(previous)
    const after = classifyCharacter(code)

    if (code === codes.equalsTo) {
      if (size > 1) return nok(code)
      effects.consume(code)
      size++
      return more
    }

    if (size < 2) return nok(code)
    const token = effects.exit('ofmHighlightSequenceTemporary')
    token._open = !after || (after === constants.attentionSideAfter && Boolean(before))
    token._close = !before || (before === constants.attentionSideAfter && Boolean(after))
    return ok(code)
  }
}
