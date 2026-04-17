import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import { remarkOfm, rehypeOfm } from 'mdian'
import type { OfmRemarkOptions } from 'mdian'
import { createMarkdownComponents } from './lib/markdown-components.js'

const defaultDemoMarkdown = [
  '# mdian + react-markdown',
  '',
  'Visit [[Project Notes|the project note]] for more detail.',
  '',
  'Embed an image:',
  '![[assets/image.svg|50x60]]',
  '',
  'Embed a markdown note:',
  '![[Project Notes]]',
  '',
  'Embed a heading section:',
  '![[Project Notes#Overview]]',
  '',
  'Embed a block ref:',
  '![[Roadmap#^next-step]]',
  '',
  'This sentence contains ==highlighted text==.',
  '',
  '- Another wikilink: [[Roadmap#^next-step]]',
  '',
  'You can also use **regular markdown** and `code blocks` together with OFM features.'
].join('\n')

export function App() {
  const [markdown, setMarkdown] = useState(defaultDemoMarkdown)
  const [options, setOptions] = useState<OfmRemarkOptions>({
    wikilinks: true,
    embeds: true,
    highlights: true
  })
  const markdownComponents = useMemo(() => createMarkdownComponents(), [])

  const lineCount = markdown.split('\n').length
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  return (
    <div className="demo-shell">
      <header className="page-header">
        <h1>mdian demo</h1>
      </header>

      <section className="controls">
        <div className="field">
          <span>Features</span>
          <div className="toggle-list">
            <FeatureToggle
              checked={options.wikilinks ?? true}
              label="Wikilinks"
              onChange={(checked) => setOptions((current) => ({ ...current, wikilinks: checked }))}
            />
            <FeatureToggle
              checked={options.embeds ?? true}
              label="Embeds"
              onChange={(checked) => setOptions((current) => ({ ...current, embeds: checked }))}
            />
            <FeatureToggle
              checked={options.highlights ?? true}
              label="Highlights"
              onChange={(checked) => setOptions((current) => ({ ...current, highlights: checked }))}
            />
          </div>
        </div>
      </section>

      <section className="compare-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Markdown</h2>
            </div>
            <div className="panel-actions">
              <button onClick={() => setMarkdown(defaultDemoMarkdown)} type="button">
                Reset
              </button>
              <button onClick={() => setMarkdown('')} type="button">
                Clear
              </button>
            </div>
          </div>

          <textarea
            className="editor"
            onChange={(event) => setMarkdown(event.target.value)}
            placeholder="Enter markdown..."
            spellCheck={false}
            value={markdown}
          />

          <p className="panel-meta">
            {lineCount} lines · {markdown.length} characters · {wordCount} words
          </p>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Preview</h2>
            </div>
          </div>

          <div className="preview markdown-body">
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[[rehypeOfm, { renderBlockAnchorLabels: true }]]}
              remarkPlugins={[[remarkOfm, options]]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </section>
      </section>
    </div>
  )
}

function FeatureToggle({
  checked,
  label,
  onChange
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle">
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  )
}
