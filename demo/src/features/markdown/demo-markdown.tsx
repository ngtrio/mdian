import { Link } from "@tanstack/react-router";
import { createElement } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Components } from "react-markdown";
import type { PluggableList } from "unified";
import {
  createOfmReactPreset,
  type OfmReactPresetOptions,
  type OfmReactTarget,
} from "mdian/react";

import {
  buildDemoWikiHref,
  getDemoWikiPage,
} from "../../content/demo-content.js";

interface DemoMarkdownPreset {
  components: Components;
  rehypePlugins: PluggableList;
  remarkPlugins: PluggableList;
}

interface DemoMarkdownProps {
  className?: string;
  markdown: string;
}

export const demoMarkdownPreset = createDemoMarkdownPreset();

export function DemoMarkdown({ className, markdown }: DemoMarkdownProps) {
  return (
    <article className={className}>
      <ReactMarkdown
        components={demoMarkdownPreset.components}
        rehypePlugins={demoMarkdownPreset.rehypePlugins}
        remarkPlugins={demoMarkdownPreset.remarkPlugins}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}

function createDemoMarkdownPreset(
  options: OfmReactPresetOptions = {},
): DemoMarkdownPreset {
  const preset = createOfmReactPreset({
    ...options,
    image: {
      transformSrc: resolveDemoAssetHref,
      ...options.image,
    },
    noteEmbed: {
      maxDepth: 2,
      resolve(target) {
        const page = getDemoWikiPage(target.path);
        return page
          ? {
              markdown: page.markdown,
              title: buildDemoTitle(target, page.title),
            }
          : undefined;
      },
      ...options.noteEmbed,
    },
    wikiLink: {
      resolve(target) {
        return {
          href: buildDemoWikiHref(target.path, target.fragment),
          title: buildDemoTitle(target),
        };
      },
      render({ children, className, href, title }) {
        return createElement(
          Link,
          {
            className,
            title,
            to: href,
          },
          children,
        );
      },
      ...options.wikiLink,
    },
    externalEmbeds: {
      twitter: {
        enhance: true,
        ...options.externalEmbeds?.twitter,
      },
    },
  });

  return {
    components: preset.components,
    remarkPlugins: [remarkGfm, remarkMath, ...preset.remarkPlugins],
    rehypePlugins: [rehypeKatex, ...preset.rehypePlugins],
  };
}

function buildDemoTitle(
  target: OfmReactTarget,
  fallbackTitle?: string,
): string {
  if (fallbackTitle) {
    return fallbackTitle;
  }

  if (target.fragment) {
    return `${target.path}#${target.fragment}`;
  }

  return target.path;
}

function resolveDemoAssetHref(src: string): string {
  const normalizedSrc = src.startsWith("/") ? src.slice(1) : src;

  if (!normalizedSrc.startsWith("assets/")) {
    return src;
  }

  const baseUrl = import.meta.env.BASE_URL;

  if (!baseUrl || baseUrl === "/") {
    return `/${normalizedSrc}`;
  }

  return `${baseUrl.replace(/\/$/, "")}/${normalizedSrc}`;
}
