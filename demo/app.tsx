import {useEffect, useRef, useState, type ComponentPropsWithoutRef} from 'react'
import ReactMarkdown, {type Components} from 'react-markdown'

import {remarkOfm, rehypeOfm} from 'remark-ofm'
import type {OfmRemarkOptions} from 'remark-ofm'
import {demoExamples} from './examples.js'

const usageSnippet = [
  "import ReactMarkdown from 'react-markdown'",
  "import {remarkOfm, rehypeOfm} from 'remark-ofm'",
  '',
  "const markdown = `Visit [[Project Notes]] and ==highlight this==.`",
  '',
  'export function Example() {',
  '  return (',
  '    <ReactMarkdown',
  '      remarkPlugins={[[remarkOfm]]}',
  "      rehypePlugins={[[rehypeOfm, {hrefPrefix: 'notes'}]]}",
  '    >',
  '      {markdown}',
  '    </ReactMarkdown>',
  '  )',
  '}'
].join('\n')

function stripOfmProps(props: Record<string, unknown>) {
  const {
    dataOfmAlias: _alias,
    dataOfmBlockId: _blockId,
    dataOfmKind: _kind,
    dataOfmPath: _path,
    dataOfmPermalink: _permalink,
    dataOfmValue: _value,
    'data-ofm-alias': _dataAlias,
    'data-ofm-block-id': _dataBlockId,
    'data-ofm-kind': _dataKind,
    'data-ofm-path': _dataPath,
    'data-ofm-permalink': _dataPermalink,
    'data-ofm-value': _dataValue,
    ...rest
  } = props

  return rest
}

function readOfmProp(node: {properties?: Record<string, unknown>} | undefined, key: string): string {
  const value = node?.properties?.[key]
  return typeof value === 'string' ? value : ''
}

const markdownComponents: Components = {
  a({node, className, ...props}) {
    const anchorProps = stripOfmProps(props as Record<string, unknown>) as ComponentPropsWithoutRef<'a'>
    const isWikiLink = readOfmProp(node, 'dataOfmKind') === 'wikilink'

    return (
      <a
        {...anchorProps}
        className={[className, isWikiLink ? 'wiki-link' : null].filter(Boolean).join(' ')}
      />
    )
  },
  img({node, className, alt, src, title, ...props}) {
    const imageProps = stripOfmProps(props as Record<string, unknown>) as ComponentPropsWithoutRef<'img'>

    if (readOfmProp(node, 'dataOfmKind') !== 'embed') {
      return <img {...imageProps} alt={alt} className={className} src={src} title={title} />
    }

    const value = readOfmProp(node, 'dataOfmValue') || alt || ''
    const path = readOfmProp(node, 'dataOfmPath')
    const permalink = readOfmProp(node, 'dataOfmPermalink')
    const alias = readOfmProp(node, 'dataOfmAlias')
    const blockId = readOfmProp(node, 'dataOfmBlockId')
    const label = alias || path || permalink || value || 'Embedded note'
    const target = value ? `![[${value}]]` : ''
    const detail = blockId
      ? `block reference ^${blockId}`
      : permalink && path && permalink !== path
        ? `heading target ${permalink.slice(path.length + 1)}`
        : path
          ? `path ${path}`
          : ''

    return (
      <span className="embed-card">
        <span className="embed-label">embed</span>
        <strong>{label}</strong>
        {target ? <span className="embed-meta">{target}</span> : null}
        {detail ? <span className="embed-note">{detail}</span> : null}
      </span>
    )
  },
  mark({className, ...props}) {
    const markProps = stripOfmProps(props as Record<string, unknown>) as ComponentPropsWithoutRef<'mark'>

    return <mark {...markProps} className={[className, 'ofm-highlight'].filter(Boolean).join(' ')} />
  }
}

function CopyButton({text}: {text: string}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button className="copy-button" onClick={handleCopy} type="button">
      {copied ? (
        <>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

export function App() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [markdown, setMarkdown] = useState(demoExamples[0]?.value ?? '')
  const [options, setOptions] = useState<OfmRemarkOptions>({
    wikilinks: true,
    embeds: true,
    highlights: true
  })
  const [showExamples, setShowExamples] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedExample = demoExamples[selectedIndex] ?? demoExamples[0]
  const lineCount = markdown.split('\n').length
  const wordCount = markdown.split(/\s+/).filter(Boolean).length

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExamples(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <div>
            <p className="site-kicker">live parser lab / obsidian flavored markdown</p>
            <h1>remark-ofm</h1>
          </div>
          <nav className="site-nav" aria-label="Page sections">
            <a href="#workspace">workspace</a>
            <a href="#usage">usage</a>
          </nav>
        </div>
        <p className="site-summary">
          A cleaner playground for testing wikilinks, embeds, and highlights in a normal
          react-markdown flow.
        </p>
      </header>

      <main className="page-shell">
        <section className="toolbar" id="workspace">
          <div className="toolbar-group">
            <span className="toolbar-label">sample</span>
            <div className="sample-picker" ref={dropdownRef}>
              <button
                aria-controls="demo-example-menu"
                aria-expanded={showExamples}
                className={showExamples ? 'picker-button is-open' : 'picker-button'}
                onClick={() => setShowExamples(!showExamples)}
                type="button"
              >
                <span>
                  <strong>{selectedExample.name}</strong>
                  <small>{selectedExample.description}</small>
                </span>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </button>

              {showExamples && (
                <div className="example-menu" id="demo-example-menu" role="listbox">
                  {demoExamples.map((example, index) => (
                    <button
                      className={index === selectedIndex ? 'example-option is-active' : 'example-option'}
                      key={example.name}
                      onClick={() => {
                        setSelectedIndex(index)
                        setMarkdown(example.value)
                        setShowExamples(false)
                      }}
                      type="button"
                    >
                      <strong>{example.name}</strong>
                      <span>{example.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="toolbar-group toolbar-group--options">
            <span className="toolbar-label">features</span>
            <div className="toggle-strip">
              <FeatureToggle
                checked={options.wikilinks ?? true}
                label="Wikilinks"
                onChange={(checked) => setOptions((current) => ({...current, wikilinks: checked}))}
              />
              <FeatureToggle
                checked={options.embeds ?? true}
                label="Embeds"
                onChange={(checked) => setOptions((current) => ({...current, embeds: checked}))}
              />
              <FeatureToggle
                checked={options.highlights ?? true}
                label="Highlights"
                onChange={(checked) => setOptions((current) => ({...current, highlights: checked}))}
              />
            </div>
          </div>
        </section>

        <div className="example-note" role="note">
          <span>focus</span>
          <p>{selectedExample.description}</p>
        </div>

        <section className="workbench">
          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="panel-kicker">input</p>
                <h2>Markdown source</h2>
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

            <div className="panel-meta">
              <span>{lineCount} lines</span>
              <span>{markdown.length} characters</span>
              <span>{wordCount} words</span>
            </div>
          </article>

          <article className="panel">
            <div className="panel-head">
              <div>
                <p className="panel-kicker">output</p>
                <h2>Rendered preview</h2>
              </div>
              <div className="status-list" aria-label="Feature status">
                {Object.entries(options).map(([name, enabled]) => (
                  <span className={enabled ? 'status-pill is-enabled' : 'status-pill'} key={name}>
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="preview-surface">
              <div className="markdown-body">
                <ReactMarkdown
                  components={markdownComponents}
                  rehypePlugins={[[rehypeOfm, {hrefPrefix: 'wiki'}]]}
                  remarkPlugins={[[remarkOfm, options]]}
                >
                  {markdown}
                </ReactMarkdown>
              </div>
            </div>
          </article>
        </section>

        <section className="panel section-panel" id="usage">
          <div className="section-head">
            <div>
              <p className="panel-kicker">reference</p>
              <h2>Quick start</h2>
            </div>
            <CopyButton text={usageSnippet} />
          </div>
          <pre className="code-block">
            <code>{usageSnippet}</code>
          </pre>
        </section>

        <section className="feature-grid" aria-label="Supported features">
          <FeatureCard
            description="Parse [[Wiki Links]] with optional aliases and block references."
            syntax="[[Page]] [[Page#Heading]] [[Page#^block-id]] [[Page|Alias]]"
            tag="01"
            title="Wikilinks"
          />
          <FeatureCard
            description="Render ![[...]] targets as embeds while preserving note metadata in the preview."
            syntax="![[Page]] ![[Page#section]] ![[Page#^block-id]]"
            tag="02"
            title="Embeds"
          />
          <FeatureCard
            description="Keep ==highlight== syntax readable without sacrificing the rest of the prose styling."
            syntax="==highlighted text=="
            tag="03"
            title="Highlights"
          />
        </section>
      </main>

      <footer className="site-footer">
        <p>
          remark-ofm integrates with react-markdown and the wider unified ecosystem without needing a
          separate rendering model.
        </p>
      </footer>
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

function FeatureCard({
  description,
  syntax,
  tag,
  title
}: {
  description: string
  syntax: string
  tag: string
  title: string
}) {
  return (
    <article className="feature-card">
      <div className="feature-head">
        <span className="feature-tag">{tag}</span>
        <h3>{title}</h3>
      </div>
      <p>{description}</p>
      <code>{syntax}</code>
    </article>
  )
}
