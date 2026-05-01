import {Outlet, createRootRoute, createRoute, createRouter} from '@tanstack/react-router'

import {ShowcasePage} from './showcase-page.js'
import {WikiPage} from './wiki-page.js'

const rootRoute = createRootRoute({
  component: Outlet
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ShowcasePage
})

const wikiPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'wiki/$',
  component: WikiPage
})

const routeTree = rootRoute.addChildren([indexRoute, wikiPageRoute])

export const router = createRouter({
  routeTree,
  basepath: resolveRouterBasePath(import.meta.env.BASE_URL)
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function resolveRouterBasePath(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') {
    return '/'
  }

  return baseUrl.replace(/\/$/, '')
}
