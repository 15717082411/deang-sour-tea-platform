import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import { createSeedData, DEMO_DATA_VERSION, DEMO_STORAGE_KEY } from '../../data/seed'
import type { AfterSale, Booking } from '../../domain/types'
import { useAfterSalesStore } from '../../stores/afterSales'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import { useBookingsStore } from '../../stores/bookings'

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => { resolve = done })
  return { promise, resolve }
}

function createContext() {
  const data = createSeedData()
  data.users.push({ id: 'user-b', username: 'user_b', displayName: '用户 B', phone: '13900139003', role: 'USER', merchantStatus: 'NONE' })
  data.passwords['user-b'] = 'Demo123!'
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
  const pinia = createPinia()
  const repository = createDemoRepository(window.localStorage)
  useAppStore(pinia).setRepository(repository)
  return { repository, auth: useAuthStore(pinia), bookings: useBookingsStore(pinia), afterSales: useAfterSalesStore(pinia) }
}

describe('account store actor isolation', () => {
  beforeEach(() => window.localStorage.clear())

  it('does not commit an old account booking list after a login switch', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const oldBookings = await context.repository.listBookings(context.auth.actor!)
    const pending = deferred<Booking[]>()
    const original = context.repository.listBookings.bind(context.repository)
    const list = vi.spyOn(context.repository, 'listBookings').mockImplementation((actor) => (
      actor.userId === 'user-demo' ? pending.promise : original(actor)
    ))

    const staleLoad = context.bookings.load().catch(() => [])
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    await context.bookings.load()
    pending.resolve(oldBookings)
    await staleLoad

    expect(context.bookings.bookings).toEqual([])
    expect(context.bookings.currentBooking).toBeNull()
  })

  it('does not commit an old account after-sale response after a login switch', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const oldAfterSales = await context.repository.listAfterSales(context.auth.actor!)
    const pending = deferred<AfterSale[]>()
    const original = context.repository.listAfterSales.bind(context.repository)
    const list = vi.spyOn(context.repository, 'listAfterSales').mockImplementation((actor) => (
      actor.userId === 'user-demo' ? pending.promise : original(actor)
    ))

    const staleLoad = context.afterSales.load().catch(() => [])
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    await context.afterSales.load()
    pending.resolve(oldAfterSales)
    await staleLoad

    expect(context.afterSales.afterSales).toEqual([])
    expect(context.afterSales.currentAfterSale).toBeNull()
  })
})
