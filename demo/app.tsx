import { useState } from "react";
import ReactMarkdown from "react-markdown";

import { remarkOfm, rehypeOfm } from "../src/index.js";
import type { OfmRemarkOptions } from "../src/index.js";
import { demoExamples } from "./examples.js";
import type { WikiLinkData } from "../src/lib/wikilink/types.js";

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
  "      rehypePlugins={[rehypeOfm]}",
  "    >",
  "      {markdown}",
  "    </ReactMarkdown>",
  "  )",
  "}",
].join("\n");

export function App() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markdown, setMarkdown] = useState(demoExamples[0]?.value ?? "");
  const [options, setOptions] = useState<OfmRemarkOptions>({
    wikilinks: true,
    embeds: true,
    highlights: true,
  });

  const selectedExample = demoExamples[selectedIndex] ?? demoExamples[0];

  return (
    <main className="page-shell">
      <section className="hero">
        <h1>remark-ofm + react-markdown</h1>
        <p>
          Use <code>remarkOfm</code> as a real <code>react-markdown</code>{" "}
          remark plugin and preview the rendered result side by side.
        </p>
        <p>
          This demo focuses on the currently implemented OFM features:{" "}
          <strong>wikilinks</strong>, <strong>embeds</strong>, and{" "}
          <strong>highlights</strong>.
        </p>
      </section>

      <section className="layout">
        <article className="panel">
          <div className="panel-header">
            <h2>Markdown input</h2>
          </div>

          <div className="controls">
            <label className="control-group">
              <span>Sample</span>
              <select
                value={selectedIndex}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value);
                  const nextExample = demoExamples[nextIndex];
                  setSelectedIndex(nextIndex);
                  setMarkdown(nextExample?.value ?? "");
                }}
              >
                {demoExamples.map((example, index) => (
                  <option key={example.name} value={index}>
                    {example.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="control-group">
              <span>Enabled features</span>
              <div className="toggle-grid">
                <FeatureToggle
                  checked={true}
                  label="wikilinks"
                  onChange={(checked) =>
                    setOptions((current) => ({
                      ...current,
                      wikilinks: checked,
                    }))
                  }
                />
                <FeatureToggle
                  checked={true}
                  label="embeds"
                  onChange={(checked) =>
                    setOptions((current) => ({ ...current, embeds: checked }))
                  }
                />
                <FeatureToggle
                  checked={true}
                  label="highlights"
                  onChange={(checked) =>
                    setOptions((current) => ({
                      ...current,
                      highlights: checked,
                    }))
                  }
                />
              </div>
            </div>

            <label className="control-group">
              <span>Markdown</span>
              <textarea
                value={markdown}
                spellCheck={false}
                onChange={(event) => setMarkdown(event.target.value)}
              />
            </label>
          </div>

          <div className="meta">
            <div className="chips">
              {Object.entries(options).map(([name, enabled]) => (
                <span className="chip" key={name}>
                  {name}: {enabled === false ? "off" : "on"}
                </span>
              ))}
            </div>
            <p>{selectedExample?.description}</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>ReactMarkdown preview</h2>
          </div>
          <div className="preview markdown-body">
            <ReactMarkdown
              remarkPlugins={[[remarkOfm, options]]}
              rehypePlugins={[
                [rehypeOfm, { resolveHref: resolveDemoWikiHref }],
              ]}
            >
              {markdown}
            </ReactMarkdown>
          </div>
        </article>
      </section>

      <section className="panel code-panel">
        <div className="panel-header">
          <h2>ReactMarkdown usage</h2>
        </div>
        <pre>{usageSnippet}</pre>
      </section>

      <p className="footer-note">
        This demo showcases <code>remark-ofm</code> as a parser plugin inside a
        normal <code>react-markdown</code> render flow.
      </p>
    </main>
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
    <label className="toggle">
      <input
        checked={checked}
        type="checkbox"
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function resolveDemoWikiHref(wikilink: WikiLinkData): string {
  return `#/wiki/${encodeURIComponent(wikilink.permalink || wikilink.path || wikilink.value)}`;
}
