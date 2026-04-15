import {useMemo, useState} from 'react'
import ReactMarkdown from 'react-markdown'

import {remarkOfm, rehypeOfm} from 'remark-ofm'
import type {OfmRemarkOptions} from 'remark-ofm'
import {demoExamples} from './examples.js'
import {createMarkdownComponents} from './lib/markdown-components.js'

export function App() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [markdown, setMarkdown] = useState(demoExamples[0]?.value ?? '')
  const [options, setOptions] = useState<OfmRemarkOptions>({
    wikilinks: true,
    embeds: false,
    highlights: true
  })
  const markdownComponents = useMemo(() => createMarkdownComponents(), [])

  const selectedExample = demoExamples[selectedIndex] ?? demoExamples[0]
  const lineCount = markdown.split('\n').length
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  return (
    <div className="demo-shell">
      <header className="page-header">
        <h1>remark-ofm demo</h1>
        <p>Compare raw Markdown with the rendered result.</p>
      </header>

      <section className="controls">
        <label className="field">
          <span>Sample</span>
          <select
            onChange={(event) => {
              const index = Number(event.target.value)
              const example = demoExamples[index]
              setSelectedIndex(index)
              setMarkdown(example?.value ?? '')
            }}
            value={selectedIndex}
          >
            {demoExamples.map((example, index) => (
              <option key={example.name} value={index}>
                {example.name}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Features</span>
          <div className="toggle-list">
            <FeatureToggle
              checked={options.wikilinks ?? true}
              label="Wikilinks"
              onChange={(checked) => setOptions((current) => ({...current, wikilinks: checked}))}
            />
            <FeatureToggle
              checked={options.highlights ?? true}
              label="Highlights"
              onChange={(checked) => setOptions((current) => ({...current, highlights: checked}))}
            />
          </div>
        </div>

        <p className="helper-text">
          Wikilinks open the built-in demo wiki pages so you can verify heading and block targets.
        </p>
      </section>

      <section className="compare-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Markdown</h2>
              <p>{selectedExample.description}</p>
            </div>
            <div className="panel-actions">
              <button onClick={() => setMarkdown(selectedExample.value)} type="button">
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
              <p>Rendered output using react-markdown + remark-ofm.</p>
            </div>
          </div>

          <div className="preview markdown-body">
            <ReactMarkdown
              components={markdownComponents}
              rehypePlugins={[[rehypeOfm, {hrefPrefix: 'wiki'}]]}
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
