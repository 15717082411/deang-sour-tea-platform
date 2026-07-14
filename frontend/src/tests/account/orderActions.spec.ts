import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import { RepositoryError, type PlatformRepository } from '../../data/repository'
import { createSeedData, DEMO_DATA_VERSION, DEMO_STORAGE_KEY } from '../../data/seed'
import type { Actor, Booking, User } from '../../domain/types'
import AfterSaleForm from '../../components/afterSales/AfterSaleForm.vue'
import OrderDetailPage from '../../pages/account/OrderDetailPage.vue'
import OrdersPage from '../../pages/account/OrdersPage.vue'
import { createAppRouter } from '../../router'
import { useAfterSalesStore } from '../../stores/afterSales'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import { useOrdersStore } from '../../stores/orders'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const actorFor = (user: User): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

async function actors(repository: PlatformRepository) {
  const user = await repository.login({ username: 'user_demo', password: 'Demo123!' })
  const merchant = await repository.login({ username: 'merchant_demo', password: 'Demo123!' })
  const admin = await repository.login({ username: 'admin_demo', password: 'Demo123!' })
  const other = await repository.register({ username: 'account_other', password: 'Demo123!', phone: '13900139001' })
  return {
    user: actorFor(user.user),
    merchant: actorFor(merchant.user),
    admin: actorFor(admin.user),
    other: actorFor(other.user),
  }
}

async function expectCode(promise: Promise<unknown>, code: string) {
  const error = await promise.catch((caught: unknown) => caught)
  expect(error).toBeInstanceOf(RepositoryError)
  expect((error as RepositoryError).code).toBe(code)
}

function createPageContext() {
  const pinia = createPinia()
  const repository = createDemoRepository(window.localStorage)
  useAppStore(pinia).setRepository(repository)
  return { pinia, repository, auth: useAuthStore(pinia), router: createAppRouter(pinia) }
}

describe('account order lifecycle', () => {
  beforeEach(() => window.localStorage.clear())

  it('filters user records and rejects cross-user order access with stable codes', async () => {
    const repository = createDemoRepository(new MemoryStorage())
    const { user, other } = await actors(repository)

    expect((await repository.listOrders(user)).every((order) => order.userId === user.userId)).toBe(true)
    expect(await repository.listOrders(other)).toEqual([])
    await expectCode(repository.getOrder(other, 'order-shipped'), 'ORDER_FORBIDDEN')
    await expectCode(repository.receiveOrder(other, 'order-shipped'), 'ORDER_FORBIDDEN')
  })

  it('receives only an owned SHIPPED order and never duplicates the timeline', async () => {
    const repository = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repository)

    const received = await repository.receiveOrder(user, 'order-shipped')
    expect(received.status).toBe('RECEIVED')
    expect(received.timeline.filter(({ status }) => status === 'RECEIVED')).toHaveLength(1)

    await expectCode(repository.receiveOrder(user, 'order-shipped'), 'ORDER_RECEIVE_INVALID_STATUS')
    const unchanged = await repository.getOrder(user, 'order-shipped')
    expect(unchanged.timeline).toEqual(received.timeline)
    await expectCode(repository.receiveOrder(user, 'order-after-sale'), 'ORDER_RECEIVE_INVALID_STATUS')
  })

  it('requests after-sale without changing fulfillment and rejects duplicate active requests', async () => {
    const repository = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repository)
    const before = await repository.getOrder(user, 'order-shipped')

    const requested = await repository.requestAfterSale(user, before.id, '  外包装破损  ')
    const after = await repository.getOrder(user, before.id)

    expect(requested).toMatchObject({ status: 'REQUESTED', reason: '外包装破损' })
    expect(after.status).toBe('SHIPPED')
    expect(after.timeline).toHaveLength(before.timeline.length + 1)
    await expectCode(repository.requestAfterSale(user, before.id, '再次申请'), 'AFTER_SALE_DUPLICATE')
    expect((await repository.getOrder(user, before.id)).timeline).toEqual(after.timeline)
  })

  it('rejects invalid after-sale states and preserves fulfillment through refund', async () => {
    const repository = createDemoRepository(new MemoryStorage())
    const { user, merchant } = await actors(repository)

    await expectCode(repository.requestAfterSale(user, 'missing-order', '原因'), 'ORDER_NOT_FOUND')
    await expectCode(repository.requestAfterSale(user, 'order-shipped', '   '), 'AFTER_SALE_REASON_REQUIRED')

    const approved = await repository.resolveAfterSale(merchant, 'after-sale-requested', 'APPROVE', '同意退款')
    expect(approved.status).toBe('APPROVED')
    const refunded = await repository.refundAfterSale(merchant, approved.id, '模拟退款完成')
    expect(refunded.status).toBe('REFUNDED')
    expect((await repository.getOrder(user, 'order-after-sale')).status).toBe('PAID')
    await expectCode(repository.resolveAfterSale(merchant, approved.id, 'APPROVE', '重复处理'), 'AFTER_SALE_INVALID_STATUS')
  })

  it('migrates v4 fulfillment and booking data to v5 without resetting user records', async () => {
    const storage = new MemoryStorage()
    const legacy = createSeedData()
    const customUser: User = {
      id: 'user-v4-custom',
      username: 'v4_custom',
      displayName: '旧版自建用户',
      phone: '13900139004',
      role: 'USER',
      merchantStatus: 'NONE',
    }
    const customBooking = {
      id: 'booking-v4-custom',
      userId: customUser.id,
      date: '2027-08-01',
      people: 3,
      phone: customUser.phone,
      code: 'BOOK-V4-CUSTOM',
      status: 'PENDING' as const,
      createdAt: '2026-07-12T00:00:00.000Z',
    }
    legacy.users.push(customUser)
    legacy.passwords[customUser.id] = 'Custom123!'
    legacy.orders.push({
      ...legacy.orders[0],
      id: 'order-v4-custom',
      orderNo: 'DST-V4-CUSTOM',
      userId: customUser.id,
      status: 'RECEIVED',
    })
    legacy.bookings.push(customBooking as unknown as Booking)
    legacy.orders[1].status = 'AFTER_SALE_REQUESTED' as never
    delete (legacy.bookings[0] as { timeline?: unknown }).timeline
    storage.setItem('deang-sour-tea:v4', JSON.stringify({ version: 4, data: legacy }))

    const repository = createDemoRepository(storage)
    const { user } = await actors(repository)
    const persisted = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as { version: number }

    expect(DEMO_DATA_VERSION).toBe(6)
    expect(persisted.version).toBe(6)
    expect((await repository.getOrder(user, 'order-after-sale')).status).toBe('PAID')
    expect((await repository.listBookings(user))[0].timeline).toHaveLength(1)
    expect(await repository.getUser(customUser.id)).toEqual(customUser)
    expect(await repository.listOrders(actorFor(customUser))).toEqual([
      expect.objectContaining({ id: 'order-v4-custom', status: 'RECEIVED' }),
    ])
    expect(await repository.listBookings(actorFor(customUser))).toEqual([
      expect.objectContaining({ ...customBooking, timeline: expect.any(Array) }),
    ])
  })

  it('extends the existing orders store and uses a separate after-sales store', async () => {
    const context = createPageContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const orders = useOrdersStore(context.pinia)
    const afterSales = useAfterSalesStore(context.pinia)

    const received = await orders.receive('order-shipped')
    expect(received.status).toBe('RECEIVED')
    const requested = await afterSales.request(received.id, '商品破损')
    expect(requested.status).toBe('REQUESTED')
    expect(orders.currentOrder?.status).toBe('RECEIVED')
  })

  it('guards booking and every account route as USER-only', async () => {
    const adminContext = createPageContext()
    await adminContext.auth.login({ username: 'admin_demo', password: 'Demo123!' })
    for (const path of ['/booking', '/account', '/account/orders', '/account/bookings', '/account/journeys', '/account/after-sales']) {
      await adminContext.router.push(path)
      expect(adminContext.router.currentRoute.value.path).toBe('/403')
    }

    window.localStorage.clear()
    const userContext = createPageContext()
    await userContext.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await userContext.router.push('/account/orders')
    expect(userContext.router.currentRoute.value.path).toBe('/account/orders')
  })

  it('uses real lazy pages for every user-center route', () => {
    const context = createPageContext()
    const named = new Map(context.router.getRoutes().map((route) => [route.name, route]))

    for (const name of ['booking', 'account', 'account-orders', 'account-order-detail', 'account-bookings', 'account-journeys', 'account-after-sales']) {
      expect(typeof named.get(name)?.components?.default).toBe('function')
      expect(named.get(name)?.meta.roles).toEqual(['USER'])
    }
  })

  it('renders a real Shop entry when the order list is empty', async () => {
    const data = createSeedData()
    data.orders = []
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
    const context = createPageContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.router.push('/account/orders')
    const wrapper = mount(OrdersPage, { global: { plugins: [context.pinia, context.router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('还没有订单')
    expect(wrapper.get('a[href="/shop"]').text()).toContain('酸茶商城')
  })

  it('shows after-sale entry only when the order has no active request', async () => {
    const context = createPageContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.router.push('/account/orders/order-after-sale')
    const wrapper = mount(OrderDetailPage, { global: { plugins: [context.pinia, context.router] } })
    await flushPromises()

    expect(wrapper.findComponent(AfterSaleForm).exists()).toBe(false)
    await context.router.push('/account/orders/order-shipped')
    await flushPromises()
    expect(wrapper.findComponent(AfterSaleForm).exists()).toBe(true)
  })
})
