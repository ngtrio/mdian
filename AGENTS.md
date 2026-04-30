# AGENTS.md

This file is the shared contributor guide for automated agents in this repository. `CLAUDE.md` should remain a symlink to this file.

## Gotchas

- Prioritize sound architecture and clean code in every change.
- Do not make compatibility-driven compromises unless they are explicitly approved first.

## Project overview

`mdian` is a TypeScript package that adds Obsidian Flavored Markdown support to unified/remark pipelines. The public package entrypoint is `src/index.ts`, which re-exports `remarkOfm`, `rehypeOfm`, and the root URL/anchor helpers used by consumers.

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

This pattern exists for `comment`, `wikilink`, `embed`, and `highlight` under `src/lib/*/`. Callouts are implemented as a remark transform plus rehype transform, and external embeds are a rehype-only URL upgrade under `src/lib/external-embed/`.

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
- `src/lib/shared/public-props.ts` centralizes the stable `data-ofm-*` output contract used across rehype transforms.
- Feature-local `hast.ts` files own the temporary `dataOfm*` property parsing/cleanup used during rehype transforms.
- `src/lib/types.ts` defines the public option surface. `OfmRemarkOptions` controls which syntax extensions are enabled; `OfmRehypeOptions` controls URL prefixing, title assignment, block-anchor label rendering, and external URL embed upgrades.

### Tests

Tests live in `test/index.ts` and run against built output in `dist/`, so `pnpm test` always builds first via `pretest`.

There are two layers of coverage:

- Fixture-driven parser snapshots in `test/fixtures/*` validate mdast output from markdown input, with optional per-fixture config in `config.json`.
- Direct unit tests in `test/index.ts` validate rehype transforms and shared helpers like URL building, anchor lookup, and external embed upgrades.

When adding syntax support, update both the fixture set and the direct transform/helper tests if behavior changes in HTML output or utility functions.

## Demo app

The demo is intentionally thin:

- `demo/src/app/App.tsx` is the playground for editing markdown and toggling OFM remark and rehype features.
- `demo/src/pages/WikiPage.tsx` exercises routed wiki navigation, fragment targeting, and `findOfmAnchorTarget()` scrolling behavior.
- `demo/src/features/markdown/markdown-pipeline.ts` shows one app-layer integration for `react-markdown`, router-aware wikilinks, note embeds, and external embeds.

If you change parser or rehype behavior that affects rendered markup, verify both the library tests and the demo behavior.

## Public API

### Plugins

| Export | Type | Description |
|--------|------|-------------|
| `remarkOfm` | `Plugin<[OfmRemarkOptions?]>` | Remark plugin that registers micromark extensions, mdast bridges, and remark transforms for enabled OFM features |
| `rehypeOfm` | `Plugin<[OfmRehypeOptions?], Root>` | Rehype plugin that applies anchors, callouts, wikilinks, embeds, external embeds, highlights, and comments in a single tree walk |

### Configuration

**`OfmRemarkOptions`** controls which syntax extensions are active. All options default to `true`.

| Option | Syntax | Example |
|--------|--------|---------|
| `wikilinks` | `[[link]]` / `[[link\|alias]]` | `[[README]]` |
| `embeds` | `![[path]]` / `![[path\|size]]` | `![[image.png\|500]]` |
| `highlights` | `==text==` | `==important==` |
| `callouts` | `> [!type] title` | `> [!warning] Caution` |
| `comments` | `%%text%%` | `%%hidden%%` |

**`OfmRehypeOptions`** controls HTML output.

| Option | Default | Effect |
|--------|---------|--------|
| `externalEmbeds` | `true` | Upgrade supported external media URLs written as Markdown images into embeds |
| `hrefPrefix` | `undefined` | Prefix prepended to all wiki/embed `href` values |
| `renderBlockAnchorLabels` | `true` | Render visible `^blockId` labels inside block-anchor elements |
| `setTitle` | `true` | Populate `title` on wikilinks and embeds |

### Rendered HTML contract

Generated elements use stable `data-ofm-*` attributes:

- `data-ofm-kind="wikilink"`
- `data-ofm-kind="embed"` with `data-ofm-variant="note" | "image" | "file" | "external"`
- `data-ofm-kind="embed"` with `data-ofm-provider="youtube" | "twitter"` for external embeds
- `data-ofm-kind="callout"`
- `data-ofm-kind="highlight"`
- `data-ofm-kind="anchor-target"` with `data-ofm-variant="heading" | "block"`

Additional metadata may include `data-ofm-path`, `data-ofm-alias`, `data-ofm-fragment`, and `data-ofm-block-id`.
For wikilinks and embeds, the target contract is `data-ofm-path` plus optional `data-ofm-fragment`. `data-ofm-block-id` remains specific to rendered block anchor targets.

Generated elements also use stable `ofm-*` class names defined in `src/lib/shared/class-name.ts`, including `ofm-wikilink`, `ofm-embed`, `ofm-external-embed`, `ofm-highlight`, `ofm-callout`, `ofm-callout-title`, `ofm-callout-content`, `ofm-anchor-target`, `ofm-heading-target`, `ofm-block-target`, and `ofm-block-anchor-label`.

### Root entrypoint exports

| Export | Signature | Purpose |
|--------|-----------|---------|
| `buildOfmTargetUrl` | `(target: OfmTargetUrlInput, prefix?: string) => string` | Build a full `/{prefix}/{path}#{fragment}` URL |
| `decodeOfmFragment` | `(value: string) => string` | Decode a URL fragment, with or without a leading `#` |
| `findOfmAnchorTarget` | `<T>(root: OfmAnchorRootLike<T>, hash: string \| null \| undefined) => T \| undefined` | Query the DOM for the element matching a hash |
| `normalizeOfmPath` | `(path: string) => string` | Decode, trim, and normalize wiki-style paths |

`OfmTargetUrlInput` requires `path`; optional `fragment` adds a `#fragment`.
`fragment` never includes the leading `#`.
Block refs use `fragment: '^block-id'`.
Nested headings use `fragment: 'Heading#Subheading'`.
`[[Page#Heading#^block-id]]` is intentionally unsupported.

Types `OfmAnchorRootLike` and `OfmAnchorTargetLike` define the minimal interface consumers must implement for `findOfmAnchorTarget()` to work with their DOM layer.
