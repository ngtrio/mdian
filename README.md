# mdian

`mdian` is a TypeScript integration layer for rendering Obsidian Flavored Markdown (OFM) with `react-markdown`.

It provides:

- `createOfmReactMarkdown` to enable OFM syntax in a `react-markdown` pipeline
- URL and anchor helpers for applications that need OFM-style wiki navigation
- a small CSS entrypoint for sensible default styling

## Supported OFM Syntax

`mdian` currently supports:

- Wikilinks: `[[Page]]`, `[[Page#Heading]]`, `[[Page#^block-id]]`, `[[Page|Alias]]`
- Embeds: `![[Page]]`, `![[Page#Heading]]`, `![[Page#^block-id]]`
- Highlights: `==highlight==`
- Comments: `%%hidden note%%`
- Callouts

See the showcase at https://ngtrio.github.io/mdian

Regular Markdown still works as usual. GFM and math are not bundled by this package; add `remark-gfm`, `remark-math`, `rehype-katex`, or other plugins yourself when needed.

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

## Wiki Helpers

The root `mdian` entrypoint exposes helpers for wiring OFM links and hashes into your own router or note viewer:

```ts
import {
  buildOfmTargetUrl,
  decodeOfmFragment,
  findOfmAnchorTarget,
  normalizeOfmPath
} from 'mdian'
```

- `normalizeOfmPath` normalizes decoded wiki-style paths.
- `decodeOfmFragment` decodes heading or block fragments without lowercasing them.
- `buildOfmTargetUrl` builds application-facing hrefs from an OFM target plus an optional route prefix.
- `findOfmAnchorTarget` finds the rendered heading or block target for a hash.

Example:

```ts
import {
  buildOfmTargetUrl,
  decodeOfmFragment,
  findOfmAnchorTarget,
  normalizeOfmPath
} from 'mdian'

const pagePath = normalizeOfmPath(params.slug ?? '')
const fragment = decodeOfmFragment(window.location.hash)
const href = buildOfmTargetUrl(
  {
    path: 'Roadmap',
    permalink: 'Roadmap#Next Steps'
  },
  'wiki'
)

const target = findOfmAnchorTarget(document.body, `#${fragment}`)
```


## Development

From the repository root:

```bash
pnpm install
pnpm build
pnpm test
pnpm demo:dev
```
