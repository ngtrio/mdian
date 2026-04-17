import {render} from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import {describe, expect, test} from 'vitest'

import {createMarkdownComponents} from './lib/markdown-components.js'
import {buildRehypePlugins, buildRemarkPlugins, defaultDemoRehypeOptions} from './lib/markdown-pipeline.js'
import {defaultRemarkOptions} from './lib/remark-options.js'

describe('demo callout rendering', () => {
  test('renders callout markdown as callout DOM rather than blockquote', () => {
    const markdown = '> [!note] Note title\n> Basic callout body.'
    const features = {gfm: true, math: true}
    const components = createMarkdownComponents({features, remarkOptions: defaultRemarkOptions})
    const remarkPlugins = buildRemarkPlugins(defaultRemarkOptions, features)
    const rehypePlugins = buildRehypePlugins(defaultDemoRehypeOptions, features)

    const {container} = render(
      <ReactMarkdown components={components} rehypePlugins={rehypePlugins} remarkPlugins={remarkPlugins}>
        {markdown}
      </ReactMarkdown>
    )

    const callout = container.querySelector('.ofm-callout')
    expect(callout).not.toBeNull()
    expect(container.querySelector('blockquote')).toBeNull()
    expect(callout?.querySelector('.ofm-callout-title')?.textContent).toBe('Note title')
    expect(callout?.querySelector('.ofm-callout-content p')?.textContent).toBe('Basic callout body.')
  })

  test('renders foldable callouts as native details elements that can toggle open', () => {
    const markdown = '> [!warning]- Collapsed foldable\n> This one starts collapsed.'
    const features = {gfm: true, math: true}
    const components = createMarkdownComponents({features, remarkOptions: defaultRemarkOptions})
    const remarkPlugins = buildRemarkPlugins(defaultRemarkOptions, features)
    const rehypePlugins = buildRehypePlugins(defaultDemoRehypeOptions, features)

    const {container} = render(
      <ReactMarkdown components={components} rehypePlugins={rehypePlugins} remarkPlugins={remarkPlugins}>
        {markdown}
      </ReactMarkdown>
    )

    const callout = container.querySelector('details.ofm-callout') as HTMLDetailsElement | null
    const title = container.querySelector('summary.ofm-callout-title')

    expect(callout).not.toBeNull()
    expect(title).not.toBeNull()
    expect(callout?.open).toBe(false)

    callout!.open = true

    expect(callout?.open).toBe(true)
  })
})
