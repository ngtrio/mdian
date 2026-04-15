# remark-ofm Demo

Interactive playground for `remark-ofm` - an Obsidian Flavored Markdown parser for unified/remark.

## Features

- **Real-time preview**: See parsed OFM syntax rendered instantly
- **Interactive controls**: Toggle wikilinks and highlights on/off
- **Multiple examples**: Browse curated examples showcasing each feature
- **Modern UI**: Dark theme with gradient backgrounds and smooth animations
- **Responsive design**: Works on desktop and mobile devices

## Running the Demo

```bash
# From the repository root
pnpm demo:dev

# Or from the demo directory
cd demo
pnpm dev
```

The demo will be available at `http://localhost:5173`

## Supported OFM Syntax

### Wikilinks
```
[[Page]]
[[Page#heading]]
[[Page#^block-ref]]
[[Page|Custom Alias]]
```

### Highlights
```
==highlighted text==
```

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS 4
- react-markdown
- @tanstack/react-router

## Development

The demo uses a workspace reference to the main `remark-ofm` package, so changes to the parser will be reflected immediately in the demo during development.
