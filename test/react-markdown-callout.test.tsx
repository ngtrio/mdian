import {render} from '@testing-library/react'
import ReactMarkdown from 'react-markdown'
import {describe, expect, test} from 'vitest'

import {createOfmReactMarkdown} from '../src/react-markdown/index.js'

describe('mdian React callout rendering', () => {
  test('renders callouts through the public mdian/react-markdown surface', () => {
    const ofm = createOfmReactMarkdown({
      ofm: {callouts: true}
    })

    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'> [!note] Note title\n> Basic callout body.'}
      </ReactMarkdown>
    )

    expect(container.querySelector('.ofm-callout')).not.toBeNull()
    expect(container.querySelector('blockquote')).toBeNull()
  })

  test('renders foldable callouts as native details elements that can toggle open', () => {
    const ofm = createOfmReactMarkdown({
      ofm: {callouts: true}
    })

    const {container} = render(
      <ReactMarkdown components={ofm.components} rehypePlugins={[ofm.rehypePlugin]} remarkPlugins={[ofm.remarkPlugin]}>
        {'> [!warning]- Collapsed foldable\n> This one starts collapsed.'}
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
