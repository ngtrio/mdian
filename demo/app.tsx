import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

import { remarkOfm, rehypeOfm } from "remark-ofm";
import type { OfmRemarkOptions } from "remark-ofm";
import { demoExamples } from "./examples.js";

const usageSnippet = [
  "import ReactMarkdown from 'react-markdown'",
  "import remarkOfm, {rehypeOfm} from 'remark-ofm'",
  "",
  "const markdown = `Visit [[Project Notes]] and ==highlight this==.`",
  "",
  "export function Example() {",
  "  return (",
  "    <ReactMarkdown",
  "      remarkPlugins={[remarkOfm]}",
  "      rehypePlugins={[[rehypeOfm, { hrefPrefix: 'notes' }]]}",
  "    >",
  "      {markdown}",
  "    </ReactMarkdown>",
  "  )",
  "}",
].join("\n");

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

export function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markdown, setMarkdown] = useState(demoExamples[0]?.value ?? "");
  const [options, setOptions] = useState<OfmRemarkOptions>({
    wikilinks: true,
    embeds: true,
    highlights: true,
  });
  const [showExamples, setShowExamples] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedExample = demoExamples[selectedIndex] ?? demoExamples[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExamples(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                remark-ofm
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Obsidian Flavored Markdown parser for unified/remark
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
              >
                GitHub
              </a>
              <span className="text-slate-700">•</span>
              <a
                href="#usage"
                className="text-slate-400 hover:text-slate-200 transition-colors text-sm"
              >
                Usage
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Example selector and toggles */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              <span className="font-medium">{selectedExample.name}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showExamples && (
              <div className="absolute top-full mt-2 left-0 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-20 overflow-hidden">
                {demoExamples.map((example, index) => (
                  <button
                    key={example.name}
                    onClick={() => {
                      setSelectedIndex(index);
                      setMarkdown(example.value);
                      setShowExamples(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors ${
                      index === selectedIndex ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-slate-200 text-sm">{example.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{example.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <FeatureToggle
              checked={options.wikilinks ?? true}
              label="Wikilinks"
              onChange={(checked) =>
                setOptions((current) => ({ ...current, wikilinks: checked }))
              }
            />
            <FeatureToggle
              checked={options.embeds ?? true}
              label="Embeds"
              onChange={(checked) =>
                setOptions((current) => ({ ...current, embeds: checked }))
              }
            />
            <FeatureToggle
              checked={options.highlights ?? true}
              label="Highlights"
              onChange={(checked) =>
                setOptions((current) => ({ ...current, highlights: checked }))
              }
            />
          </div>
        </div>

        {/* Description badge */}
        <div className="mb-4">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            {selectedExample?.description}
          </span>
        </div>

        {/* Split view: Editor + Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Editor panel */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMarkdown(selectedExample.value)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMarkdown('')}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
                <span className="text-xs text-slate-500 font-medium">Markdown</span>
              </div>
            </div>
            <textarea
              value={markdown}
              spellCheck={false}
              onChange={(event) => setMarkdown(event.target.value)}
              className="w-full min-h-[500px] p-4 bg-transparent text-slate-200 font-mono text-sm resize-none focus:outline-none leading-relaxed"
              placeholder="Enter markdown..."
            />
            <div className="px-4 py-2 border-t border-slate-800/50 text-xs text-slate-500 flex justify-between">
              <span>{markdown.split('\n').length} lines</span>
              <span>{markdown.length} characters</span>
              <span>{markdown.split(/\s+/).filter(Boolean).length} words</span>
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Preview</span>
              <div className="flex items-center gap-2">
                {Object.entries(options).map(([name, enabled]) => (
                  <span
                    key={name}
                    className={`px-2 py-0.5 text-xs rounded ${
                      enabled
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-6 min-h-[500px] prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[[remarkOfm, options]]}
                rehypePlugins={[[rehypeOfm, { hrefPrefix: "wiki" }]]}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Usage section */}
        <section id="usage" className="bg-slate-900/50 border border-slate-800/50 rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300">Quick Start</h3>
            <CopyButton text={usageSnippet} />
          </div>
          <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
            <code className="text-slate-300">{usageSnippet}</code>
          </pre>
        </section>

        {/* Features grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            title="Wikilinks"
            description="Parse [[Wiki Links]] with optional aliases and block references"
            syntax="[[Page]] [[Page#heading]] [[Page|^block]] [[Page|Alias]]"
            icon="🔗"
          />
          <FeatureCard
            title="Embeds"
            description="Embed content from other notes with ![[syntax]]"
            syntax="![[Page]] ![[Page#section]] ![[Page|^block]]"
            icon="📄"
          />
          <FeatureCard
            title="Highlights"
            description="Mark important text with ==highlight== syntax"
            syntax="==highlighted text=="
            icon="✨"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-sm text-slate-500 text-center">
            remark-ofm integrates seamlessly with react-markdown and other unified ecosystem tools
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-0"
      />
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </label>
  );
}

function FeatureCard({
  title,
  description,
  syntax,
  icon,
}: {
  title: string;
  description: string;
  syntax: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-900/30 border border-slate-800/50 rounded-lg p-4 hover:bg-slate-900/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h4 className="font-semibold text-slate-200">{title}</h4>
      </div>
      <p className="text-sm text-slate-400 mb-3">{description}</p>
      <code className="text-xs bg-slate-800/50 px-2 py-1 rounded text-blue-300 block overflow-x-auto">
        {syntax}
      </code>
    </div>
  );
}
