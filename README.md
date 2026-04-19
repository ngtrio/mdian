# mdian

`mdian` is a TypeScript parser toolkit for Obsidian Flavored Markdown (OFM) on top of the Unified ecosystem.

It provides:

- `remarkOfm` for parsing OFM syntax into mdast
- `rehypeOfm` for rendering OFM-specific output in hast
- `createOfmReactMarkdown` for `react-markdown`
- a small CSS entrypoint for sensible default styling

## Supported OFM Syntax

`mdian` currently supports:

- Wikilinks: `[[Page]]`, `[[Page#Heading]]`, `[[Page#^block-id]]`, `[[Page|Alias]]`
- Embeds: `![[Page]]`, `![[Page#Heading]]`, `![[Page#^block-id]]`
- Highlights: `==highlight==`
- Comments: `%%hidden note%%`
- Callouts

See the showcase from https://ngtrio.github.io/mdian

Regular Markdown still works as usual. GFM and math are not bundled by this package; add `remark-gfm`, `remark-math`, `rehype-katex`, or other plugins yourself when needed.

## Unified Usage

Use `remarkOfm` during Markdown parsing and `rehypeOfm` after the mdast to hast step:

```ts
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import {remarkOfm, rehypeOfm} from 'mdian'

const file = await unified()
  .use(remarkParse)
  .use(remarkOfm, {
    callouts: true,
    comments: true,
    embeds: true,
    highlights: true,
    wikilinks: true
  })
  .use(remarkRehype)
  .use(rehypeOfm, {
    hrefPrefix: 'wiki',
    renderBlockAnchorLabels: true
  })
  .use(rehypeStringify)
  .process('Visit [[Project Notes]] and ![[Roadmap#^next-step]].')
```

## `react-markdown` Usage

`mdian/react-markdown` returns the plugin pair plus OFM-aware component overrides:

```tsx
import ReactMarkdown from 'react-markdown'
import {createOfmReactMarkdown} from 'mdian/react-markdown'
import 'mdian/styles.css'

const ofm = createOfmReactMarkdown({
  ofm: {
    hrefPrefix: 'wiki',
    renderBlockAnchorLabels: true
  },
  components: {
    renderWikiLink({children, href, path, permalink}) {
      return <a href={href} data-path={path} data-permalink={permalink}>{children}</a>
    },
    renderNoteEmbed({children, href, title}) {
      return <aside><a href={href}>{title}</a>{children}</aside>
    }
  }
})

export function Markdown({source}: {source: string}) {
  return (
    <ReactMarkdown
      components={ofm.components}
      remarkPlugins={[ofm.remarkPlugin]}
      rehypePlugins={[ofm.rehypePlugin]}
    >
      {source}
    </ReactMarkdown>
  )
}
```

If you also need GFM or math, add those plugins around the `mdian` adapter in the same pipeline.


## Development

From the repository root:

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:dev
```
