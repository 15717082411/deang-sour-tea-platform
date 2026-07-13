import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import { createAppRouter, sanitizeRedirect } from '../../router'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

function createRouterContext() {
  const pinia = createPinia()
  const app = useAppStore(pinia)
  app.setRepository(createDemoRepository(window.localStorage))
  return { router: createAppRouter(pinia), auth: useAuthStore(pinia) }
}

describe('route guards', () => {
  beforeEach(() => window.localStorage.clear())

  it('redirects a guest checkout request to login with the original route', async () => {
    const { router } = createRouterContext()

    await router.push('/checkout')

    expect(router.currentRoute.value.fullPath).toBe('/login?redirect=/checkout')
  })

  it('denies a USER access to the administrator workspace', async () => {
    const { router, auth } = createRouterContext()
    await auth.login({ username: 'user_demo', password: 'Demo123!' })

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/403')
  })

  it('sends a pending merchant applicant to the application status route', async () => {
    const { router, auth } = createRouterContext()
    await auth.login({ username: 'user_demo', password: 'Demo123!' })

    await router.push('/merchant')

    expect(router.currentRoute.value.path).toBe('/merchant/apply')
  })

  it('allows an ADMIN to enter the administrator workspace', async () => {
    const { router, auth } = createRouterContext()
    await auth.login({ username: 'admin_demo', password: 'Demo123!' })

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it.each(['https://example.com', '//example.com', '/\\example.com', 'javascript:alert(1)', ['/', '//example.com']])(
    'rejects an unsafe redirect value: %o',
    (value) => {
      expect(sanitizeRedirect(value)).toBeNull()
    },
  )

  it('keeps an internal redirect path', () => {
    expect(sanitizeRedirect('/checkout?coupon=summer')).toBe('/checkout?coupon=summer')
  })

  it('rehydrates only the persisted session reference through the repository', async () => {
    const first = createRouterContext()
    await first.auth.login({ username: 'merchant_demo', password: 'Demo123!' })

    expect(JSON.parse(window.localStorage.getItem('deang-sour-tea:session') ?? '{}')).toEqual({
      userId: 'merchant-demo',
      sessionId: expect.any(String),
    })

    const second = createRouterContext()
    await second.auth.rehydrate()

    expect(second.auth.user).toMatchObject({ id: 'merchant-demo', role: 'MERCHANT', merchantStatus: 'APPROVED' })
  })

  it('clears the in-memory account and persisted session on logout', async () => {
    const { auth } = createRouterContext()
    await auth.login({ username: 'admin_demo', password: 'Demo123!' })

    auth.logout()

    expect(auth.user).toBeNull()
    expect(window.localStorage.getItem('deang-sour-tea:session')).toBeNull()
  })
})
