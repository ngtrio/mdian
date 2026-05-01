# mdian Demo

Interactive playground for `mdian` - an Obsidian Flavored Markdown parser for unified/remark.

## Features

- **Real-time preview**: See parsed OFM syntax rendered instantly
- **Sample-driven workbench**: Switch between focused OFM examples instead of one oversized fixture
- **External embeds**: Preview supported YouTube and X links rendered from plain markdown image syntax
- **Built-in wiki targets**: Follow demo wikilinks to verify heading and block target navigation
- **Router-prefixed OFM links**: Verify `hrefPrefix: 'wiki'` output through the demo router
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

The sample set covers:

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

### External Embeds
```md
![Video title](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
![](https://x.com/jack/status/20)
```

### Comments
```
%%hidden note%%
```

## Development

The demo uses a workspace reference to the main `mdian` package, so changes to the parser will be reflected immediately in the demo during development. It currently exercises `rehypeOfm` with `hrefPrefix: 'wiki'`; if you add path-candidate resolution behavior in the library, update the demo integration when you need interactive validation for that flow.
