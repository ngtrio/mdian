import { Link } from '@tanstack/react-router'
import { ofmClassNames } from 'mdian'
import { type Components } from 'react-markdown'

export function createMarkdownComponents(): Components {
  return {
    a({ className, href, node: _node, ...props }) {
      const isWikiLink = className?.split(/\s+/).includes(ofmClassNames.wikilink) ?? false

      if (!isWikiLink) {
        return <a {...props} className={className} href={href} />
      }

      return <Link {...props} className={className} to={href} />
    }
  }
}
