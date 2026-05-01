# mdian

`mdian` is a TypeScript toolkit for parsing and rendering Obsidian Flavored Markdown (OFM) with unified-compatible pipelines.

It provides:

- `remarkOfm` and `rehypeOfm` for OFM syntax and HTML transforms
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
    .use(rehypeOfm, {
      hrefPrefix: 'wiki',
      resolvePathCandidates(path) {
        return path === 'note' ? ['learning/note'] : []
      }
    })
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
import {buildOfmSlugPath} from 'mdian'
import {createOfmReactPreset} from 'mdian/react'

const notes = new Map([
  ['Project Notes', {markdown: '# Project Notes\n\nHello world.', title: 'Project Notes'}]
])

const ofm = createOfmReactPreset({
  ofm: {
    remark: {wikilinks: true, embeds: true},
    rehype: {
      externalEmbeds: true,
      hrefPrefix: 'wiki',
      resolvePathCandidates(path) {
        return path === 'Project Notes' ? ['workspace/Project Notes'] : []
      }
    }
  },
  noteEmbed: {
    resolve({path}) {
      const note = notes.get(path)
      return note ?? {
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

This path keeps OFM parsing in `mdian` while letting your app choose a URL namespace, note resolution, image URL rewriting, and optional router rendering. `rehypeOfm.resolvePathCandidates(path)` receives the raw OFM target path and lets your app return zero or more candidate note paths; when any candidates are returned, the first one wins and becomes the rendered `data-ofm-path`, `title`, and canonical href target for both wikilinks and note embeds. `rehypeOfm.hrefPrefix` is then prepended as-is ahead of that canonical target path and fragment. When you need the canonical slug path without any prefix, use `buildOfmSlugPath(path)` or `buildOfmTargetPath({path, fragment})`. If you provide `noteEmbed.resolve()`, it receives only `path` and must always return markdown content; missing-note fallbacks are now your app's responsibility. Set `externalEmbeds.twitter.enhance` to `true` only when you want the built-in X/Twitter widget enhancement path; otherwise the preset keeps the static fallback container while the core OFM output remains a single Twitter container `div` with canonical URL text content. You can also override the script loader with `loadTwitterWidgets({loadScript})`.


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
