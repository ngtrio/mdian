import {Link} from '@tanstack/react-router'
import {createElement} from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type {Components} from 'react-markdown'
import type {Pluggable, PluggableList} from 'unified'
import {createOfmReactPreset} from 'mdian/react'

import {
  getDemoWikiPage,
} from './demo-content.js'

interface DemoMarkdownPreset {
  components: Components
  rehypePlugins: PluggableList
  remarkPlugins: PluggableList
}

interface DemoMarkdownProps {
  className?: string
  markdown: string
}

const demoRemarkPlugins: Pluggable[] = [remarkGfm, remarkMath]
const demoRehypePlugins: Pluggable[] = [rehypeKatex]

const ofmPreset = createOfmReactPreset({
  image: {
    transformSrc: resolveDemoAssetHref,
  },
  markdown: {
    remarkPlugins: demoRemarkPlugins,
    rehypePlugins: demoRehypePlugins,
  },
  ofm: {
    rehype: {
      resolveHref(href) {
        return href.startsWith('#') ? href : `/wiki${href}`
      },
    },
  },
  noteEmbed: {
    maxDepth: 2,
    resolve({path}) {
      const page = getDemoWikiPage(path)
      return {
        markdown: page?.markdown ?? `# ${path}\n\nThis demo note could not be resolved.`,
        title: page?.title ?? path,
      }
    },
  },
  wikiLink: {
    render({ children, className, href, title }) {
      const hashIndex = href.indexOf('#')
      if (hashIndex === -1) {
        return createElement(Link, { className, title, to: href }, children)
      }
      const to = href.slice(0, hashIndex) || undefined
      const hash = href.slice(hashIndex + 1) || undefined
      return createElement(Link, { className, title, to, hash }, children)
    },
  },
  externalEmbeds: {
    twitter: {
      enhance: true,
    },
  },
})

export const demoMarkdownPreset = createDemoMarkdownPreset()

export function DemoMarkdown({className, markdown}: DemoMarkdownProps) {
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
  )
}

function createDemoMarkdownPreset(): DemoMarkdownPreset {
  return {
    components: ofmPreset.components,
    remarkPlugins: ofmPreset.remarkPlugins,
    rehypePlugins: ofmPreset.rehypePlugins,
  }
}

function resolveDemoAssetHref(src: string, ofmPath?: string): string {
  const candidateSrc = ofmPath ?? src
  const normalizedSrc = candidateSrc.startsWith('/') ? candidateSrc.slice(1) : candidateSrc

  if (!normalizedSrc.startsWith('assets/')) {
    return src
  }

  const baseUrl = import.meta.env.BASE_URL

  if (!baseUrl || baseUrl === '/') {
    return `/${normalizedSrc}`
  }

  return `${baseUrl.replace(/\/$/, '')}/${normalizedSrc}`
}
