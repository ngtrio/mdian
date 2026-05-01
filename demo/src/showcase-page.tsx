import {useEffect, useState} from 'react'

import {
  defaultDemoSampleKey,
  demoSamples,
  getDemoSample,
  type DemoSampleKey
} from './demo-content.js'
import {DemoMarkdown} from './demo-markdown.js'

export function ShowcasePage() {
  const [activeSampleKey, setActiveSampleKey] = useState<DemoSampleKey>(defaultDemoSampleKey)
  const activeSample = getDemoSample(activeSampleKey)
  const [markdown, setMarkdown] = useState(activeSample.markdown)
  const lineCount = markdown.split('\n').length

  useEffect(() => {
    document.documentElement.classList.add('demo-scroll-lock')
    document.body.classList.add('demo-scroll-lock')

    return () => {
      document.documentElement.classList.remove('demo-scroll-lock')
      document.body.classList.remove('demo-scroll-lock')
    }
  }, [])

  function handleSampleSelect(nextKey: DemoSampleKey) {
    const nextSample = getDemoSample(nextKey)
    setActiveSampleKey(nextKey)
    setMarkdown(nextSample.markdown)
  }

  return (
    <div className="demo-shell demo-shell--showcase demo-shell--viewport">
      <header className="demo-hero-header">
        <div>
          <h1>mdian</h1>
          <p className="hero-copy">
            Obsidian Flavored Markdown for unified + react-markdown
          </p>
        </div>
      </header>

      <section className="hero-stage hero-stage--workbench panel">
        <div className="hero-stage__meta" aria-label="Demo samples">
          {demoSamples.map((sample) => (
            <button
              className={sample.key === activeSampleKey ? 'feature-chip feature-chip--active' : 'feature-chip'}
              key={sample.key}
              onClick={() => handleSampleSelect(sample.key)}
              type="button"
            >
              {sample.title}
            </button>
          ))}
        </div>
        <div className="workbench-grid workbench-grid--stretch">
          <section className="workbench-pane workbench-pane--scrollable">
            <div className="panel-header workbench-pane__header">
              <div>
                <h2>Markdown</h2>
              </div>
              <div className="panel-actions">
                <span className="pane-meta">
                  {lineCount} lines · {markdown.length} chars
                </span>
              </div>
            </div>

            <textarea
              className="editor editor--workbench"
              onChange={(event) => setMarkdown(event.target.value)}
              spellCheck={false}
              value={markdown}
            />
          </section>

          <section className="workbench-pane workbench-pane--scrollable">
            <div className="panel-header workbench-pane__header">
              <div>
                <h2>Preview</h2>
              </div>
              <div className="panel-actions" aria-hidden="true">
                <span className="pane-meta pane-meta--placeholder">0 lines · 0 chars</span>
              </div>
            </div>

            <DemoMarkdown
              className="preview preview--hero markdown-body"
              markdown={markdown}
            />
          </section>
        </div>
      </section>
    </div>
  )
}
