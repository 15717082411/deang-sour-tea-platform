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

  it('keeps the newest booking list when same-account loads resolve out of order', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seedBooking = (await context.repository.listBookings(context.auth.actor!))[0]
    const older = [{ ...seedBooking, id: 'booking-older', code: 'BOOK-OLDER-01' }]
    const newer = [{ ...seedBooking, id: 'booking-newer', code: 'BOOK-NEWER-01' }]
    const first = deferred<Booking[]>()
    const second = deferred<Booking[]>()
    const list = vi.spyOn(context.repository, 'listBookings')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const staleLoad = context.bookings.load().catch(() => [])
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    const latestLoad = context.bookings.load()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    second.resolve(newer)
    await latestLoad
    first.resolve(older)
    await staleLoad

    expect(context.bookings.bookings).toEqual(newer)
  })

  it('keeps the newest after-sale list when same-account loads resolve out of order', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seedAfterSale = (await context.repository.listAfterSales(context.auth.actor!))[0]
    const older = [{ ...seedAfterSale, id: 'after-sale-older', reason: '较早响应' }]
    const newer = [{ ...seedAfterSale, id: 'after-sale-newer', reason: '最新响应' }]
    const first = deferred<AfterSale[]>()
    const second = deferred<AfterSale[]>()
    const list = vi.spyOn(context.repository, 'listAfterSales')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const staleLoad = context.afterSales.load().catch(() => [])
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1))
    const latestLoad = context.afterSales.load()
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    second.resolve(newer)
    await latestLoad
    first.resolve(older)
    await staleLoad

    expect(context.afterSales.afterSales).toEqual(newer)
  })

  it('does not let a late booking mutation replace the newest same-account result', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seedBooking = (await context.repository.listBookings(context.auth.actor!))[0]
    const older = { ...seedBooking, id: 'booking-mutation-older', code: 'BOOK-MUTATION-OLDER' }
    const newer = { ...seedBooking, id: 'booking-mutation-newer', code: 'BOOK-MUTATION-NEWER' }
    const first = deferred<Booking>()
    const second = deferred<Booking>()
    const create = vi.spyOn(context.repository, 'createBooking')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const staleMutation = context.bookings.create({ date: '2027-07-01', people: 1, phone: '13800138000' }).catch(() => null)
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    const latestMutation = context.bookings.create({ date: '2027-07-02', people: 2, phone: '13800138000' })
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    second.resolve(newer)
    await latestMutation
    first.resolve(older)
    await staleMutation

    expect(context.bookings.currentBooking).toEqual(newer)
    expect(context.bookings.bookings).toEqual([newer])
  })

  it('does not let a late after-sale request replace the newest same-account result', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seedAfterSale = (await context.repository.listAfterSales(context.auth.actor!))[0]
    const older = { ...seedAfterSale, id: 'after-sale-mutation-older', reason: '较早申请' }
    const newer = { ...seedAfterSale, id: 'after-sale-mutation-newer', reason: '最新申请' }
    const first = deferred<AfterSale>()
    const second = deferred<AfterSale>()
    const request = vi.spyOn(context.repository, 'requestAfterSale')
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)

    const staleMutation = context.afterSales.request('order-after-sale', '较早申请').catch(() => null)
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    const latestMutation = context.afterSales.request('order-after-sale', '最新申请')
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2))
    second.resolve(newer)
    await latestMutation
    first.resolve(older)
    await staleMutation

    expect(context.afterSales.currentAfterSale).toEqual(newer)
    expect(context.afterSales.afterSales).toEqual([newer])
  })

  it('does not commit a booking mutation that resolves after the account changes', async () => {
    const context = createContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seedBooking = (await context.repository.listBookings(context.auth.actor!))[0]
    const pending = deferred<Booking>()
    const create = vi.spyOn(context.repository, 'createBooking').mockImplementation(() => pending.promise)

    const staleMutation = context.bookings.create({ date: '2027-07-03', people: 1, phone: '13800138000' }).catch(() => null)
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    pending.resolve({ ...seedBooking, id: 'booking-old-account', code: 'BOOK-OLD-ACCOUNT' })
    await staleMutation

    expect(context.bookings.bookings).toEqual([])
    expect(context.bookings.currentBooking).toBeNull()
  })
})
