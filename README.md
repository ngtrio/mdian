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

### Core unified usage

`mdian` ships the core OFM plugins for unified-compatible pipelines.

Install the package and styles entrypoint:

```bash
pnpm add mdian
```

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
    .use(rehypeOfm, {hrefPrefix: 'wiki'})
    .use(rehypeStringify)
    .process(source)
)
```

If you also need GFM or math, add those plugins around `remarkOfm` and `rehypeOfm` in the same pipeline.

## ReactMarkdown Usage

If you are using `react-markdown`, prefer the high-level React preset from `mdian/react`.
Install the React dependencies in your app before using this subpath:

```bash
pnpm add mdian react react-markdown
```

```ts
import ReactMarkdown from 'react-markdown'
import {buildOfmTargetUrl} from 'mdian'
import {createOfmReactPreset} from 'mdian/react'

const notes = new Map([
  ['Project Notes', {markdown: '# Project Notes\n\nHello world.', title: 'Project Notes'}]
])

const ofm = createOfmReactPreset({
  ofm: {
    remark: {wikilinks: true, embeds: true},
    rehype: {externalEmbeds: true}
  },
  wikiLink: {
    resolve(target) {
      return {
        href: buildOfmTargetUrl(target, 'wiki'),
        title: target.fragment
          ? `${target.path}#${target.fragment}`
          : target.path
      }
    }
  },
  noteEmbed: {
    resolve(target) {
      const note = notes.get(target.path)
      return note ? {markdown: note.markdown, title: note.title} : undefined
    }
  },
  image: {
    transformSrc(src) {
      return src.startsWith('assets/') ? `/${src}` : src
    }
  },
  externalEmbeds: {
    twitter: {
      enhance: true
    }
  }
})

export function Markdown({markdown}: {markdown: string}) {
  return (
    <ReactMarkdown
      components={ofm.components}
      rehypePlugins={ofm.rehypePlugins}
      remarkPlugins={ofm.remarkPlugins}
    >
      {markdown}
    </ReactMarkdown>
  )
}
```

This path keeps OFM parsing in `mdian` while letting your app inject link resolution, note resolution, image URL rewriting, and optional router rendering. Set `externalEmbeds.twitter.enhance` to `true` only when you want the built-in X/Twitter widget enhancement path; otherwise the preset keeps the static fallback container while the core OFM output remains a single Twitter container `div` with canonical URL text content. You can also override the script loader with `loadTwitterWidgets({loadScript})`.

## Breaking Target Model

`mdian` models OFM targets as `path + fragment`:

- `path: string`
- `fragment?: string`

`fragment` never includes the leading `#`.
Block refs are represented as `fragment: '^block-id'`.
Nested headings are represented as `fragment: 'Heading#Subheading'`.
`[[Page#Heading#^block-id]]` is intentionally unsupported and is not assigned special semantics.

`buildOfmTargetUrl()` accepts that shape directly and emits slug URLs from both the target path and fragment. Rendered OFM metadata still exposes the original `data-ofm-fragment`, while wikilinks and embeds no longer emit `data-ofm-block-id`.

## External Embeds

`rehypeOfm` also upgrades plain Markdown image URLs from supported providers into embeds:

- `![](https://www.youtube.com/watch?v=...)`, `![](https://youtu.be/...)`, and `![](https://www.youtube.com/shorts/...)` render as YouTube `<iframe>` embeds with the `ofm-external-embed` class.
- `![](https://x.com/.../status/...)` and `![](https://twitter.com/.../status/...)` render as tweet embed containers with `data-ofm-provider="twitter"` and the `ofm-external-embed` class; the static core output is a single `div` whose text content is the canonical Twitter status URL.

Set `externalEmbeds: false` to keep those URLs on the normal Markdown image path.
If you want interactive X/Twitter widgets instead of the static container output, load the provider script in your app after render.

## Development

From the repository root:

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:dev
```

## Releasing

- Regular feature and fix PRs do not change `package.json.version`.
- To cut a release, merge the desired version bump to `main`, then run `pnpm release`.
- `pnpm release` tags the current `main` commit as `v<version>` and pushes that tag to `origin`.
- The publish workflow runs from that tag, verifies the package, publishes to npm, and creates the matching GitHub Release.

## License

Apache-2.0.
