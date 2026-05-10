# mdian

[![npm version](https://img.shields.io/npm/v/mdian.svg)](https://www.npmjs.com/package/mdian)
[![CI](https://github.com/ngtrio/mdian/actions/workflows/ci.yml/badge.svg)](https://github.com/ngtrio/mdian/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/mdian.svg)](./LICENSE)

Obsidian Flavored Markdown support for unified, remark, rehype, and React Markdown.

`mdian` adds Obsidian-style links, embeds, callouts, highlights, comments, and anchor behavior to Markdown pipelines without taking over the rest of your Markdown stack. Use it with plain unified pipelines, or use the React preset when rendering with `react-markdown`.

[Try the demo](https://ngtrio.github.io/mdian)

## Features

- Unified-compatible `remarkOfm` and `rehypeOfm` plugins.
- Wikilinks, note embeds, image/file embeds, highlights, comments, and callouts.
- Heading and block anchor output that works with native browser hash navigation.
- Optional YouTube and X/Twitter external embeds from standard Markdown image syntax.
- Stable `data-ofm-*` attributes and `ofm-*` class names for app integrations.
- Optional `mdian/react` preset for `react-markdown` components, note embeds, image URL rewriting, and X/Twitter enhancement.
- Small optional stylesheet at `mdian/styles.css`.

Regular Markdown still works as usual. GFM, math, syntax highlighting, and other Markdown extensions are not bundled; add plugins such as `remark-gfm`, `remark-math`, or `rehype-katex` in your own pipeline.

## Supported Syntax

| Feature | Examples |
| --- | --- |
| Wikilinks | <code>[[Page]]</code>, <code>[[Page#Heading]]</code>, <code>[[Page#^block-id]]</code>, <code>[[Page&#124;Alias]]</code> |
| Embeds | <code>![[Page]]</code>, <code>![[Page#Heading]]</code>, <code>![[Page#^block-id]]</code>, <code>![[image.png&#124;500]]</code> |
| Highlights | `==important==` |
| Comments | `%%hidden note%%` |
| Callouts | `> [!warning] Caution` |
| External embeds | `![Video](https://www.youtube.com/watch?v=...)`, `![](https://x.com/user/status/...)` |

## Installation

```bash
pnpm add mdian
```

For a complete unified HTML pipeline, install the surrounding unified packages you use in your app:

```bash
pnpm add unified remark-parse remark-rehype rehype-stringify
```

For React Markdown usage:

```bash
pnpm add mdian react react-markdown
```

`mdian` requires Node.js 18 or newer.

## Quick Start

```ts
import rehypeStringify from 'rehype-stringify'
import {rehypeOfm, remarkOfm} from 'mdian'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'
import 'mdian/styles.css'

const source = [
  '# Project Notes',
  '',
  'See [[Roadmap|the roadmap]].',
  '',
  '> [!tip] Remember',
  '> You can highlight ==important== details.',
  '',
  '![[Architecture#Overview]]'
].join('\n')

const html = String(
  await unified()
    .use(remarkParse)
    .use(remarkOfm)
    .use(remarkRehype)
    .use(rehypeOfm, {
      hrefPrefix: 'wiki',
      resolvePathCandidates(path) {
        return path === 'Roadmap' ? ['docs/Roadmap'] : []
      }
    })
    .use(rehypeStringify)
    .process(source)
)
```

`resolvePathCandidates(path)` receives the raw OFM target path. When it returns one or more candidates, the first candidate becomes the canonical rendered target for `data-ofm-path`, `title`, and generated hrefs.

## React Markdown

Use `createOfmReactPreset` from `mdian/react` when rendering with `react-markdown`. The preset wires the remark and rehype plugins together and adds components for wiki links, embeds, images, and supported external embeds.

```tsx
import ReactMarkdown from 'react-markdown'
import {createOfmReactPreset} from 'mdian/react'
import remarkGfm from 'remark-gfm'
import 'mdian/styles.css'

const notes = new Map([
  ['Project Notes', {markdown: '# Project Notes\n\nHello world.', title: 'Project Notes'}]
])

const ofm = createOfmReactPreset({
  markdown: {
    remarkPlugins: [remarkGfm]
  },
  ofm: {
    rehype: {
      hrefPrefix: 'wiki',
      resolvePathCandidates(path) {
        return path === 'Project Notes' ? ['workspace/Project Notes'] : []
      }
    }
  },
  noteEmbed: {
    resolve({path}) {
      return notes.get(path) ?? {
        markdown: `# ${path}\n\nMissing note content.`,
        title: path
      }
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

The React preset keeps application-specific behavior in your app:

- `markdown.remarkPlugins` and `markdown.rehypePlugins` add shared Markdown extensions once.
- `wikiLink.render` can replace the default `<a>` rendering with your router link.
- `noteEmbed.resolve` resolves `![[note]]` embeds to Markdown content.
- `noteEmbed.maxDepth` limits recursive note embed rendering.
- `image.transformSrc` rewrites image URLs before rendering.
- `externalEmbeds.twitter.enhance` enables the built-in X/Twitter widget enhancement path.

## API

### Package Exports

| Import | Exports |
| --- | --- |
| `mdian` | `remarkOfm`, `rehypeOfm`, `buildOfmFragmentHash`, `buildOfmSlugPath`, `buildOfmTargetHref`, `buildOfmTargetPath` |
| `mdian/react` | `createOfmReactPreset`, `loadTwitterWidgets`, React preset types |
| `mdian/styles.css` | Optional default styles for generated OFM markup |

### `remarkOfm(options)`

`remarkOfm` registers the micromark extensions, mdast bridges, and post-parse remark transforms for enabled OFM syntax. All syntax options default to `true`.

| Option | Syntax |
| --- | --- |
| `wikilinks` | <code>[[Page]]</code>, <code>[[Page#Heading]]</code>, <code>[[Page&#124;Alias]]</code> |
| `embeds` | <code>![[Page]]</code>, <code>![[image.png&#124;500]]</code> |
| `highlights` | `==important==` |
| `comments` | `%%hidden note%%` |
| `callouts` | `> [!note] Title` |

### `rehypeOfm(options)`

`rehypeOfm` walks the hast tree once and applies OFM HTML transforms.

| Option | Default | Effect |
| --- | --- | --- |
| `externalEmbeds` | `true` | Upgrade supported Markdown image URLs into external embeds. |
| `hrefPrefix` | `undefined` | Prefix generated wiki and embed hrefs, such as `wiki` -> `/wiki/page`. |
| `renderBlockAnchorLabels` | `true` | Render visible `^blockId` labels inside block-anchor targets. |
| `resolvePathCandidates` | `undefined` | Resolve a raw OFM target path to zero or more canonical candidate paths. |
| `setTitle` | `true` | Populate `title` attributes on wikilinks and embeds. |

### URL Helpers

```ts
import {
  buildOfmFragmentHash,
  buildOfmSlugPath,
  buildOfmTargetHref,
  buildOfmTargetPath
} from 'mdian'
```

Use these helpers when your app needs the same slug, fragment, and href behavior as `rehypeOfm`.

## HTML Contract

Generated elements use stable public attributes:

- `data-ofm-kind="wikilink"`
- `data-ofm-kind="embed"` with `data-ofm-variant="note" | "image" | "file" | "external"`
- `data-ofm-kind="embed"` with `data-ofm-provider="youtube" | "twitter"` for external embeds
- `data-ofm-kind="callout"`
- `data-ofm-kind="highlight"`

Additional metadata may include `data-ofm-path`, `data-ofm-alias`, `data-ofm-fragment`, and `data-ofm-block-id`.

Generated elements also use stable class names, including `ofm-wikilink`, `ofm-embed`, `ofm-external-embed`, `ofm-highlight`, `ofm-callout`, `ofm-callout-title`, `ofm-callout-content`, `ofm-heading-target`, `ofm-block-target`, and `ofm-block-anchor-label`.

Heading and block anchor targets render native HTML `id` attributes whose values match the canonical OFM fragment slug, so browser hash navigation works without custom JavaScript.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm demo:dev
```

Tests live in `test/` and run against built output in `dist/`. The demo app in `demo/` consumes the workspace package directly and is useful for checking parser and rendering behavior interactively.

## Releasing

- Regular feature and fix PRs do not change `package.json.version`.
- To cut a release, merge the desired version bump to `main`, then run `pnpm release`.
- `pnpm release` tags the current `main` commit as `v<version>` and pushes that tag to `origin`.
- The publish workflow runs from that tag, verifies the package, publishes to npm, and creates the matching GitHub Release.

## License

Apache-2.0. See [LICENSE](./LICENSE).
