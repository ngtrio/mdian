import {Outlet, createRootRoute, createRoute, createRouter} from '@tanstack/react-router'

import {App} from './App.js'
import {WikiPage} from '../pages/WikiPage.js'

const rootRoute = createRootRoute({
  component: Outlet
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App
})

const wikiPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'wiki/$',
  component: WikiPage
})

const routeTree = rootRoute.addChildren([indexRoute, wikiPageRoute])

export const router = createRouter({routeTree})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
