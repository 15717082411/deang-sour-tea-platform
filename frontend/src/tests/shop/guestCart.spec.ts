import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import type { Actor } from '../../domain/types'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import {
  GUEST_CART_STORAGE_KEY,
  readGuestCart,
  writeGuestCart,
} from '../../utils/guestCart'

function createAuthContext() {
  const pinia = createPinia()
  const repository = createDemoRepository(window.localStorage)
  useAppStore(pinia).setRepository(repository)
  return { auth: useAuthStore(pinia), repository }
}

const userActor = (userId: string): Actor => ({ userId, role: 'USER' })

describe('guest cart storage and authentication merge', () => {
  beforeEach(() => window.localStorage.clear())

  it('persists only versioned productId and quantity fields', () => {
    writeGuestCart([
      { productId: 'product-tasting', quantity: 2, unitPriceCents: 1, role: 'ADMIN', userId: 'forged' },
    ])

    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      lines: [{ productId: 'product-tasting', quantity: 2 }],
    })
    expect(readGuestCart()).toEqual([{ productId: 'product-tasting', quantity: 2 }])
  })

  it('safely cleans malformed JSON, wrong versions and invalid line structures', () => {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, '{bad json')
    expect(readGuestCart()).toEqual([])
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull()

    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({ version: 99, lines: [] }))
    expect(readGuestCart()).toEqual([])
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull()

    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      lines: [
        { productId: 'product-tasting', quantity: 1, unitPriceCents: 1 },
        { productId: '', quantity: 1 },
        { productId: 'product-gift', quantity: 0 },
        { productId: 'product-gift', quantity: 1.5 },
        { productId: 'product-gift', quantity: 2, role: 'ADMIN' },
      ],
    }))

    expect(readGuestCart()).toEqual([
      { productId: 'product-tasting', quantity: 1 },
      { productId: 'product-gift', quantity: 2 },
    ])
    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? '{}')).toEqual({
      version: 1,
      lines: [
        { productId: 'product-tasting', quantity: 1 },
        { productId: 'product-gift', quantity: 2 },
      ],
    })
  })

  it('merges and removes the guest cart after login', async () => {
    const { auth, repository } = createAuthContext()
    writeGuestCart([{ productId: 'product-tasting', quantity: 2 }])

    await auth.login({ username: 'user_demo', password: 'Demo123!' })

    expect(await repository.getCart(userActor('user-demo'))).toEqual([
      { productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 },
    ])
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull()
    expect(auth.cartSyncMessage).toBeNull()
  })

  it('merges and removes the guest cart after registration', async () => {
    const { auth, repository } = createAuthContext()
    writeGuestCart([{ productId: 'product-gift', quantity: 3 }])

    const user = await auth.register({ username: 'guest-register', password: 'Demo123!', phone: '13800138021' })

    expect(await repository.getCart(userActor(user.id))).toEqual([
      { productId: 'product-gift', quantity: 3, unitPriceCents: 16800 },
    ])
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull()
  })

  it('merges the guest cart after session rehydration', async () => {
    const first = createAuthContext()
    await first.auth.login({ username: 'user_demo', password: 'Demo123!' })
    writeGuestCart([{ productId: 'product-gift', quantity: 2 }])
    const second = createAuthContext()

    await second.auth.rehydrate()

    expect(second.auth.user?.id).toBe('user-demo')
    expect(await second.repository.getCart(userActor('user-demo'))).toEqual([
      { productId: 'product-gift', quantity: 2, unitPriceCents: 16800 },
    ])
    expect(window.localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull()
  })

  it('keeps authentication and guest data when merge fails, exposing a recoverable message', async () => {
    const { auth, repository } = createAuthContext()
    writeGuestCart([{ productId: 'product-tasting', quantity: 1 }])
    vi.spyOn(repository, 'mergeCart').mockRejectedValueOnce(new Error('模拟同步失败'))

    const user = await auth.login({ username: 'user_demo', password: 'Demo123!' })

    expect(user.id).toBe('user-demo')
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.cartSyncMessage).toContain('购物车同步失败')
    expect(readGuestCart()).toEqual([{ productId: 'product-tasting', quantity: 1 }])
  })

  it('keeps carts isolated when users switch accounts', async () => {
    const { auth, repository } = createAuthContext()
    const second = await repository.register({ username: 'cart-account-b', password: 'Demo123!', phone: '13800138022' })
    writeGuestCart([{ productId: 'product-tasting', quantity: 1 }])
    await auth.login({ username: 'user_demo', password: 'Demo123!' })
    await auth.logout()
    writeGuestCart([{ productId: 'product-gift', quantity: 2 }])

    await auth.login({ username: 'cart-account-b', password: 'Demo123!' })

    expect(await repository.getCart(userActor('user-demo'))).toEqual([
      { productId: 'product-tasting', quantity: 1, unitPriceCents: 5900 },
    ])
    expect(await repository.getCart(userActor(second.user.id))).toEqual([
      { productId: 'product-gift', quantity: 2, unitPriceCents: 16800 },
    ])
  })
})
