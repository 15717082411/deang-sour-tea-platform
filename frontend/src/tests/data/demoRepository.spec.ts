import type { OrderContact } from '../../domain/types'
import { createDemoRepository } from '../../data/demoRepository'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const contact: OrderContact = {
  recipient: '测试用户',
  phone: '13800138000',
  address: '云南省德宏州芒市测试路 1 号',
}

describe('demo repository', () => {
  it('registers a user and completes the payment lifecycle', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.register({ username: 'new-user', password: 'Demo123!', phone: '13800138000' })
    const order = await repo.createOrder(user.user.id, [{ productId: 'product-tasting', quantity: 2 }], contact)

    expect(order.status).toBe('PENDING_PAYMENT')
    expect((await repo.payOrder(order.id, 'SUCCESS')).status).toBe('PAID')
  })

  it('rejects a duplicate username and invalid registration phone', async () => {
    const repo = createDemoRepository(new MemoryStorage())

    await expect(repo.register({ username: 'user_demo', password: 'Demo123!', phone: '13800138000' })).rejects.toThrow()
    await expect(repo.register({ username: 'other-user', password: 'Demo123!', phone: '10000000000' })).rejects.toThrow()
  })

  it('rejects orders whose requested quantity exceeds available stock', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })

    await expect(repo.createOrder(user.user.id, [{ productId: 'product-tasting', quantity: 81 }], contact)).rejects.toThrow()
  })

  it('only decrements stock on the first successful payment and makes repeated payment idempotent', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const before = await repo.getProduct('product-tasting')
    const order = await repo.createOrder(user.user.id, [{ productId: before.id, quantity: 2 }], contact)

    const paid = await repo.payOrder(order.id, 'SUCCESS')
    const afterFirstPayment = await repo.getProduct(before.id)
    const paidAgain = await repo.payOrder(order.id, 'SUCCESS')
    const afterRepeatedPayment = await repo.getProduct(before.id)

    expect(paid.status).toBe('PAID')
    expect(paidAgain).toEqual(paid)
    expect(afterFirstPayment.stock).toBe(before.stock - 2)
    expect(afterRepeatedPayment.stock).toBe(afterFirstPayment.stock)
  })

  it('enforces merchant ownership and role restrictions', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const order = (await repo.listOrders({ userId: user.user.id, role: 'USER' }))[0]

    await expect(repo.saveProduct({ userId: user.user.id, role: 'USER' }, {
      name: '越权商品', category: '体验装', priceCents: 5900, stock: 1, description: 'x', image: 'x',
    })).rejects.toThrow()
    await expect(repo.shipOrder({ userId: merchant.user.id, role: 'MERCHANT', merchantId: merchant.user.merchantId }, order.id)).rejects.toThrow()
    await expect(repo.reviewProduct({ userId: merchant.user.id, role: 'MERCHANT', merchantId: merchant.user.merchantId }, 'product-pending', { result: 'APPROVE' })).rejects.toThrow()
  })

  it('persists versioned data, returns clones, and reset restores the deterministic seed', async () => {
    const storage = new MemoryStorage()
    const repo = createDemoRepository(storage)
    const products = await repo.listProducts()
    products[0].name = '被外部修改'
    expect((await repo.getProduct(products[0].id)).name).not.toBe('被外部修改')

    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    await repo.saveCart(user.user.id, [{ productId: 'product-tasting', quantity: 1, unitPriceCents: 5900 }])
    expect(JSON.parse(storage.getItem('deang-sour-tea:v2') ?? '{}').version).toBe(2)

    await repo.reset()
    expect(await repo.getCart(user.user.id)).toEqual([])
    expect(JSON.parse(storage.getItem('deang-sour-tea:v2') ?? '{}').version).toBe(2)
  })

  it('seeds every later-task defense scenario with correct access and status', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
    const userActor = { userId: user.user.id, role: user.user.role } as const
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const adminActor = { userId: admin.user.id, role: admin.user.role } as const

    expect((await repo.listProducts()).filter((product) => product.status === 'APPROVED')).toHaveLength(2)
    expect((await repo.getProduct('product-pending')).status).toBe('PENDING')
    expect(await repo.listContents()).toHaveLength(2)
    expect((await repo.listMerchantApplications(adminActor)).some((application) => application.status === 'PENDING')).toBe(true)
    expect((await repo.listBookings(userActor)).some((booking) => booking.status === 'PENDING')).toBe(true)
    expect((await repo.listOrders(userActor)).some((order) => order.status === 'SHIPPED')).toBe(true)
    expect((await repo.listAfterSales(merchantActor)).some((afterSale) => afterSale.status === 'REQUESTED')).toBe(true)

    const shipped = (await repo.listOrders(userActor)).find((order) => order.status === 'SHIPPED')
    expect(shipped).toBeDefined()
    await expect(repo.receiveOrder(merchantActor, shipped!.id)).rejects.toThrow()
    expect((await repo.receiveOrder(userActor, shipped!.id)).status).toBe('RECEIVED')
  })
})
