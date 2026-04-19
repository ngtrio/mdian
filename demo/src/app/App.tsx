import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import type { OfmMarkdownOptions } from 'mdian/react-markdown'
import { createDemoMarkdownPreset } from '../features/markdown/markdown-pipeline.js'
import { defaultDemoMarkdown } from '../fixtures/default-demo-markdown.js'

export function App() {
  const [markdown, setMarkdown] = useState(defaultDemoMarkdown)
  const [options, setOptions] = useState<OfmMarkdownOptions>({})
  const preset = useMemo(() => createDemoMarkdownPreset(options), [options])

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
            <FeatureToggle
              checked={options.comments ?? true}
              label="Comments"
              onChange={(checked) => setOptions((current) => ({ ...current, comments: checked }))}
            />
            <FeatureToggle
              checked={options.callouts ?? true}
              label="Callouts"
              onChange={(checked) => setOptions((current) => ({ ...current, callouts: checked }))}
            />
          </div>
          <p className="helper-text">CommonMark, GFM, and LaTeX are enabled by default. Toggle OFM features here.</p>
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
              components={preset.components}
              rehypePlugins={preset.rehypePlugins}
              remarkPlugins={preset.remarkPlugins}
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
