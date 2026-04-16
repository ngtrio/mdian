# mdian Demo

Interactive playground for `mdian` - an Obsidian Flavored Markdown parser for unified/remark.

## Features

- **Real-time preview**: See parsed OFM syntax rendered instantly
- **Single demo document**: Focus on one editable example combining wikilinks, highlights, and block targets
- **Interactive controls**: Toggle the OFM features used in the showcase
- **Built-in wiki targets**: Follow demo wikilinks to verify heading and block target navigation
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

The default demo document demonstrates:

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

## Development

The demo uses a workspace reference to the main `mdian` package, so changes to the parser will be reflected immediately in the demo during development.
