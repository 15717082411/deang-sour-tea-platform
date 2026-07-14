import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { createAppRouter } from '../../router'

describe('public route integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('keeps every Task 5 public page behind a lazy route component', () => {
    const router = createAppRouter(createPinia())
    const publicRouteNames = ['home', 'culture', 'culture-detail', 'craft', 'stories']

    for (const name of publicRouteNames) {
      const route = router.getRoutes().find((candidate) => candidate.name === name)
      expect(route, `missing route ${name}`).toBeDefined()
      expect(typeof route?.components?.default, `route ${name} must be lazy`).toBe('function')
    }
  })

  it('resolves an unknown public URL through the global not-found route', async () => {
    const router = createAppRouter(createPinia())

    await router.push('/unknown-public-page')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('not-found')
    expect(router.currentRoute.value.matched.some(({ name }) => name === 'not-found')).toBe(true)
  })

  it('resolves an initial History route under the project base', async () => {
    const originalPath = window.location.pathname
    window.history.replaceState({}, '', '/deang-sour-tea-platform/culture/what-is-sour-tea')
    const router = createAppRouter(createPinia(), '/deang-sour-tea-platform/')
    const app = createApp({ render: () => null })

    try {
      app.use(router)
      app.mount(document.createElement('div'))
      await router.isReady()

      expect(router.currentRoute.value.name).toBe('culture-detail')
      expect(router.currentRoute.value.params.slug).toBe('what-is-sour-tea')
    } finally {
      app.unmount()
      window.history.replaceState({}, '', originalPath)
    }
  })
})
