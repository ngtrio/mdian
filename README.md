# mdian

`mdian` is a TypeScript toolkit for parsing and rendering Obsidian Flavored Markdown (OFM) with unified-compatible pipelines.

It provides:

- `remarkOfm` and `rehypeOfm` for OFM syntax and HTML transforms
- URL and anchor helpers for applications that need OFM-style wiki navigation
- a small CSS entrypoint for sensible default styling

## Supported OFM Syntax

`mdian` currently supports:

- Wikilinks: `[[Page]]`, `[[Page#Heading]]`, `[[Page#^block-id]]`, `[[Page|Alias]]`
- Embeds: `![[Page]]`, `![[Page#Heading]]`, `![[Page#^block-id]]`
- Highlights: `==highlight==`
- Comments: `%%hidden note%%`
- Callouts
- External embeds from standard Markdown image syntax for supported YouTube and X/Twitter URLs

See the showcase at https://ngtrio.github.io/mdian

Regular Markdown still works as usual. GFM and math are not bundled by this package; add `remark-gfm`, `remark-math`, `rehype-katex`, or other plugins yourself when needed.

## Usage

`mdian` ships the core OFM plugins for unified-compatible pipelines.

Use `remarkOfm` and `rehypeOfm` in any unified-compatible pipeline:

```ts
import rehypeStringify from 'rehype-stringify'
import {rehypeOfm, remarkOfm} from 'mdian'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'
import 'mdian/styles.css'

const html = String(
  await unified()
    .use(remarkParse)
    .use(remarkOfm, {wikilinks: true, embeds: true})
    .use(remarkRehype)
    .use(rehypeOfm, {hrefPrefix: 'wiki', renderBlockAnchorLabels: true})
    .use(rehypeStringify)
    .process(source)
)
```

If you also need GFM or math, add those plugins around `remarkOfm` and `rehypeOfm` in the same pipeline.

## External Embeds

`rehypeOfm` also upgrades plain Markdown image URLs from supported providers into embeds:

- `![](https://www.youtube.com/watch?v=...)`, `![](https://youtu.be/...)`, and `![](https://www.youtube.com/shorts/...)` render as YouTube `<iframe>` embeds.
- `![](https://x.com/.../status/...)` and `![](https://twitter.com/.../status/...)` render as tweet embed blockquotes with `data-ofm-provider="twitter"`.

Set `externalEmbeds: false` to keep those URLs on the normal Markdown image path.
If you want interactive X/Twitter widgets instead of a plain blockquote fallback, load the provider script in your app after render.

## Development

From the repository root:

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:dev
```

## License

Apache-2.0.
