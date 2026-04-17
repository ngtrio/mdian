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

The package is split across the same three stages for each OFM feature:

- `tokenizer.ts`: micromark tokenization for raw syntax recognition.
- `mdast.ts`: mdast-util-from-markdown bridge that turns tokens into mdast nodes and seeds `data.hName` / `data.hProperties` for downstream HTML.
- `hast.ts`: rehype-side transform that turns those intermediate elements into final HTML attributes/tags.

This pattern exists for `wikilink`, `embed`, and `highlight` under `src/lib/*/`.

`src/lib/index.ts` is the orchestration layer:

- `remarkOfm()` registers micromark extensions in `processor.data().micromarkExtensions` and mdast bridges in `fromMarkdownExtensions`.
- `ofmSyntex()` decides which inline constructs are active based on `OfmRemarkOptions`.
- `rehypeOfm()` walks the final hast tree and applies anchor, wikilink, embed, and highlight transforms in one pass.


### Shared utilities

- `src/lib/ofm-url.ts` centralizes OFM path normalization and target URL generation. Reuse it instead of rebuilding link/embed URLs by hand.
- `src/lib/ofm-node.ts` is the bridge between temporary `dataOfm*` properties and strongly-typed OFM node data during rehype transforms.
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
