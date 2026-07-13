import { createPinia } from 'pinia'
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
})
