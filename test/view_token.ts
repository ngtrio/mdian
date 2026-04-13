import test from 'node:test'
import remarkParse from 'remark-parse'
import { unified, type Processor } from 'unified'
import { getBucket, ofmSyntex } from '../src/lib/index.js'
import type { Extension, Handle } from 'mdast-util-from-markdown'



test('', async () => {

    const processor = unified()
        .use(remarkParse)
        .use(remarkViewer)

    processor.parse('[[Content]]')
})



function remarkViewer(this: Processor): void {
    getBucket(this, 'micromarkExtensions').push(
        ofmSyntex()
    )
    getBucket(this, 'fromMarkdownExtensions').push(
        wikiLinkMast(),
    )
}

function wikiLinkMast(): Extension {
  const enter: Record<string, Handle> = {}
  const exit: Record<string, Handle> = {}

  enter.ofmWikiLink = printToken
  enter.ofmWikiMarker = printToken
  enter.ofmWikiValue = printToken

  return {
    enter,
    exit
  }
}

const printToken: Handle = function (token) {
    const text = this.sliceSerialize(token)
    console.log({
        type: token.type,
        start: token.start.offset,
        end: token.end.offset,
        text: text
    })
}
