# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

`mdian` is a TypeScript package that adds Obsidian Flavored Markdown support to unified/remark pipelines. The public package entrypoint is `src/index.ts`, which re-exports the main `remarkOfm` and `rehypeOfm` plugins plus anchor/URL helpers used by consumers.

The repository also contains a `demo/` Vite + React app that consumes the workspace package directly. Use it to validate parser and rehype behavior interactively.

## Common commands

- Install dependencies: `pnpm install`
- Build library: `pnpm build`
- Typecheck library: `pnpm typecheck`
- Run tests: `pnpm test`
- Run coverage: `pnpm coverage`
- Run full library check: `pnpm check`
- Run a single Node test after building: `node --enable-source-maps --test --test-name-pattern "<test name>" dist/test/index.js`
- Run demo dev server: `pnpm demo:dev`
- Build demo: `pnpm demo:build`
- Typecheck demo: `pnpm demo:typecheck`
- Preview demo build: `pnpm demo:preview`

## Architecture

### Parsing pipeline

Most inline OFM features are split across the same three stages:

- `tokenizer.ts`: micromark tokenization for raw syntax recognition.
- `mdast.ts`: mdast-util-from-markdown bridge that turns micromark tokens into mdast nodes and seeds `data.hName` / `data.hProperties` for downstream HTML.
- `hast.ts`: rehype-side transform that turns those intermediate elements into final HTML attributes/tags.

This pattern exists for `comment`, `wikilink`, `embed`, and `highlight` under `src/lib/*/`.

Module naming is based on responsibility, not just the data structure being touched:

- Use `tokenizer.ts` for micromark constructs.
- Use `mdast.ts` for `fromMarkdownExtensions` bridges. Do not rename these to `micromark.ts`; they sit on the mdast compilation boundary, even though they consume micromark tokens.
- Use `remark.ts` for whole-tree remark/mdast transforms that run after parsing.
- Use `hast.ts` for rehype/hast transforms.


`src/lib/index.ts` is the orchestration layer:

- Feature modules export descriptor-style registrations from their local `index.ts` files; the entrypoint should assemble those descriptors rather than special-casing feature functions by name.
- `remarkOfm()` registers micromark extensions in `processor.data().micromarkExtensions`, mdast bridges in `fromMarkdownExtensions`, and any post-parse remark transforms declared by feature descriptors.
- `ofmSyntex()` decides which inline constructs are active based on `OfmRemarkOptions`.
- `rehypeOfm()` walks the final hast tree and applies the ordered rehype transforms declared by feature descriptors in one pass.


### Shared utilities

- `src/lib/shared/ofm-url.ts` centralizes OFM path normalization and target URL generation. Reuse it instead of rebuilding link/embed URLs by hand.
- `src/lib/shared/class-name.ts` centralizes OFM class name constants and class merging behavior for rehype transforms.
- `src/lib/shared/ofm-node.ts` centralizes shared parsing and cleanup for internal `dataOfm*` bridge properties.
- Feature-local `hast.ts` files own the temporary `dataOfm*` property parsing/cleanup used during rehype transforms.
- `src/lib/types.ts` defines the public option surface. `OfmRemarkOptions` controls which syntax extensions are enabled; `OfmRehypeOptions` controls URL prefixing, embed resolution, title assignment, and block-anchor label rendering.

### Tests

Tests live in `test/index.ts` and run against built output in `dist/`, so `pnpm test` always builds first via `pretest`.

There are two layers of coverage:

- Fixture-driven parser snapshots in `test/fixtures/*` validate mdast output from markdown input, with optional per-fixture config in `config.json`.
- Direct unit tests in `test/index.ts` validate rehype transforms and shared helpers like URL building and anchor lookup.

When adding syntax support, update both the fixture set and the direct transform/helper tests if behavior changes in HTML output or utility functions.

## Demo app

The demo is intentionally thin:

- `demo/app.tsx` is the playground for editing markdown and toggling OFM remark features.
- `demo/wiki-page.tsx` exercises routed wiki navigation, fragment targeting, and `findOfmAnchorTarget()` scrolling behavior.
- `demo/lib/markdown-components.tsx` swaps OFM-generated wiki links onto TanStack Router links, which is the main integration example for app consumers.

If you change parser or rehype behavior that affects rendered markup, verify both the library tests and the demo behavior.

## Public API

### Plugins

| Export | Type | Description |
|--------|------|-------------|
| `remarkOfm` | `Plugin<[OfmRemarkOptions?]>` | Remark plugin — registers micromark extensions + mdast bridges for all enabled OFM features |
| `rehypeOfm` | `Plugin<[OfmRehypeOptions?], Root>` | Rehype plugin — single-pass hast transform for anchors, callouts, wikilinks, embeds, highlights, comments |

### Configuration

**`OfmRemarkOptions`** — controls which syntax extensions are active (all default to `true`):

| Option | Syntax | Example |
|--------|--------|---------|
| `wikilinks` | `[[link]]` / `[[link\|alias]]` | `[[README]]` |
| `embeds` | `![[path]]` / `![[path\|size]]` | `![[image.png\|500]]` |
| `highlights` | `==text==` | `==important==` |
| `callouts` | `> [!type] title` | `> [!warning] Caution` |
| `comments` | `%%text%%` | `%%hidden%%` |

**`OfmRehypeOptions`** — controls HTML output:

| Option | Default | Effect |
|--------|---------|--------|
| `hrefPrefix` | `undefined` | Prefix prepended to all wiki/embed `href` values |
| `setTitle` | `false` | Populate embed `<img>` / `<a>` `title` attribute |
| `renderBlockAnchorLabels` | `false` | Render visible `^blockId` labels inside block-anchor elements |

### Style extension

All generated HTML elements carry `ofm-*` class names, available as the `ofmClassNames` constant and `OfmClassName` union type:

| Class | Element |
|-------|---------|
| `ofm-wikilink` | `<a>` from `[[link]]` |
| `ofm-embed` | `<a>` / `<img>` from `![[path]]` |
| `ofm-highlight` | `<mark>` from `==text==` |
| `ofm-callout` | `<div>` callout container |
| `ofm-callout-title` | `<div>` callout title line |
| `ofm-callout-content` | `<div>` callout body |
| `ofm-anchor-target` | Any element with `data-anchor-key` |
| `ofm-heading-target` | `<h1>`–`<h6>` with anchor key |
| `ofm-block-target` | `<p>`/`<li>` with block-id anchor |
| `ofm-block-anchor-label` | `<span>` for visible `^blockId` label |

`addClassName(properties, ...classNames)` merges OFM or custom class names onto a hast properties object.

### Anchor helpers

| Export | Signature | Purpose |
|--------|-----------|---------|
| `normalizeOfmAnchorKey` | `(value: string \| null \| undefined) => string` | Normalize a heading or block-id string for matching |
| `findOfmAnchorTarget` | `<T>(root: OfmAnchorRootLike<T>, hash: string \| null \| undefined) => T \| undefined` | Query the DOM for the element matching a hash |

Types `OfmAnchorRootLike` and `OfmAnchorTargetLike` define the minimal interface consumers must implement for `findOfmAnchorTarget` to work with their DOM layer.

### URL helpers

| Export | Signature | Purpose |
|--------|-----------|---------|
| `buildOfmTargetUrl` | `(target: OfmTargetUrlInput, prefix?: string) => string` | Build a full `/{prefix}/{path}#{fragment}` URL |
| `normalizeOfmPath` | `(path: string) => string` | Decode, trim, and filter empty segments |
| `decodeOfmFragment` | `(value: string) => string` | Decode a URL fragment (with or without leading `#`) |

`OfmTargetUrlInput` requires `path` and `permalink`; optional `blockId` overrides the fragment.
