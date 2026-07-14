import { describe, expect, expectTypeOf, it } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import type { CartRequestLine, PlatformRepository } from '../../data/repository'
import { DEMO_STORAGE_KEY, type DemoData } from '../../data/seed'
import type { Actor, OrderContact, User } from '../../domain/types'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()
  get length(): number { return this.values.size }
  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const contact: OrderContact = {
  recipient: '仓库合同用户',
  phone: '13800138000',
  address: '云南省德宏州芒市测试路 7 号',
}

const actorFor = (user: User): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

async function actors(repo: PlatformRepository) {
  const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
  const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
  const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
  return {
    user: actorFor(user.user),
    merchant: actorFor(merchant.user),
    admin: actorFor(admin.user),
  }
}

describe('commerce repository security contract', () => {
  it('exports price-free request lines and actor-bound method signatures', () => {
    expectTypeOf<CartRequestLine>().toEqualTypeOf<{ productId: string; quantity: number }>()
    expectTypeOf<Parameters<PlatformRepository['getCart']>>().toEqualTypeOf<[actor: Actor]>()
    expectTypeOf<Parameters<PlatformRepository['saveCart']>>().toEqualTypeOf<[actor: Actor, lines: CartRequestLine[]]>()
    expectTypeOf<Parameters<PlatformRepository['mergeCart']>>().toEqualTypeOf<[actor: Actor, guestLines: CartRequestLine[]]>()
    expectTypeOf<Parameters<PlatformRepository['createOrder']>>().toEqualTypeOf<[
      actor: Actor,
      lines: CartRequestLine[],
      contact: OrderContact,
      idempotencyKey: string,
    ]>()
    expectTypeOf<Parameters<PlatformRepository['payOrder']>>().toEqualTypeOf<[
      actor: Actor,
      orderId: string,
      result: 'SUCCESS' | 'FAILURE' | 'CANCEL',
    ]>()
  })

  it('rejects merchant, admin and forged USER actors for consumer commerce methods', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { merchant, admin } = await actors(repo)
    const forgedUser = { userId: merchant.userId, role: 'USER' } as const
    const lines = [{ productId: 'product-tasting', quantity: 1 }]

    for (const actor of [merchant, admin, forgedUser]) {
      await expect(repo.getCart(actor)).rejects.toThrow()
      await expect(repo.saveCart(actor, lines)).rejects.toThrow()
      await expect(repo.mergeCart(actor, lines)).rejects.toThrow()
      await expect(repo.createOrder(actor, lines, contact, 'checkout-rejected-actor')).rejects.toThrow()
    }
  })

  it('derives cart ownership from a validated user actor and ignores untrusted prices', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repo)
    const forgedPriceLine = { productId: 'product-tasting', quantity: 2, unitPriceCents: 1 }

    const saved = await repo.saveCart(user, [forgedPriceLine])

    expect(saved).toEqual([{ productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 }])
    expect(await repo.getCart(user)).toEqual(saved)
  })

  it('atomically merges duplicate guest and user quantities with stock cap and current prices', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repo)
    await repo.saveCart(user, [{ productId: 'product-tasting', quantity: 70 }])

    const merged = await repo.mergeCart(user, [
      { productId: 'product-tasting', quantity: 8 },
      { productId: 'product-tasting', quantity: 8 },
      { productId: 'product-gift', quantity: 2 },
    ])

    expect(merged).toEqual([
      { productId: 'product-tasting', quantity: 80, unitPriceCents: 5900 },
      { productId: 'product-gift', quantity: 2, unitPriceCents: 16800 },
    ])
    await expect(repo.mergeCart(user, [{ productId: 'product-pending', quantity: 1 }])).rejects.toThrow('商品不可购买')
  })

  it('returns the same order for the same user idempotency key and validates safe keys', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repo)
    const lines = [{ productId: 'product-tasting', quantity: 1 }]

    const first = await repo.createOrder(user, lines, contact, 'checkout-user-demo-0001')
    const retried = await repo.createOrder(user, lines, contact, 'checkout-user-demo-0001')

    expect(retried).toEqual(first)
    expect((await repo.listOrders(user)).filter(({ id }) => id === first.id)).toHaveLength(1)
    await expect(repo.createOrder(user, lines, contact, undefined as never)).rejects.toThrow('幂等键')
    await expect(repo.createOrder(user, lines, contact, '')).rejects.toThrow('幂等键')
    await expect(repo.createOrder(user, lines, contact, '../unsafe key')).rejects.toThrow('幂等键')
  })

  it('scopes an idempotency key to its real USER', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const first = await repo.register({ username: 'idempotent-a', password: 'Demo123!', phone: '13800138011' })
    const second = await repo.register({ username: 'idempotent-b', password: 'Demo123!', phone: '13800138012' })
    const lines = [{ productId: 'product-tasting', quantity: 1 }]

    const firstOrder = await repo.createOrder(actorFor(first.user), lines, contact, 'checkout-shared-0001')
    const secondOrder = await repo.createOrder(actorFor(second.user), lines, contact, 'checkout-shared-0001')

    expect(secondOrder.id).not.toBe(firstOrder.id)
  })

  it('rejects payment by another user, merchant, admin, or a forged actor', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { user, merchant, admin } = await actors(repo)
    const other = await repo.register({ username: 'other-payer', password: 'Demo123!', phone: '13800138013' })
    const order = await repo.createOrder(user, [{ productId: 'product-tasting', quantity: 1 }], contact, 'checkout-payment-owner')

    await expect(repo.payOrder(actorFor(other.user), order.id, 'SUCCESS')).rejects.toThrow()
    await expect(repo.payOrder(merchant, order.id, 'SUCCESS')).rejects.toThrow()
    await expect(repo.payOrder(admin, order.id, 'SUCCESS')).rejects.toThrow()
    await expect(repo.payOrder({ userId: merchant.userId, role: 'USER' }, order.id, 'SUCCESS')).rejects.toThrow()
    expect((await repo.getOrder(user, order.id)).status).toBe('PENDING_PAYMENT')
  })

  it('refreshes storage snapshots so sequential repository instances do not lose carts or orders', async () => {
    const storage = new MemoryStorage()
    const firstRepo = createDemoRepository(storage)
    const secondRepo = createDemoRepository(storage)
    const firstActors = await actors(firstRepo)
    const secondActors = await actors(secondRepo)

    await firstRepo.saveCart(firstActors.user, [{ productId: 'product-tasting', quantity: 1 }])
    const order = await secondRepo.createOrder(secondActors.user, [{ productId: 'product-gift', quantity: 1 }], contact, 'checkout-repository-refresh')
    await firstRepo.saveCart(firstActors.user, [{ productId: 'product-tasting', quantity: 2 }])

    expect(await secondRepo.getCart(secondActors.user)).toEqual([
      { productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 },
    ])
    expect(await firstRepo.getOrder(firstActors.user, order.id)).toMatchObject({ id: order.id })
  })

  it('validates all stock before payment and never applies a partial decrement', async () => {
    const storage = new MemoryStorage()
    const firstRepo = createDemoRepository(storage)
    const secondRepo = createDemoRepository(storage)
    const { user } = await actors(firstRepo)
    const competing = await firstRepo.register({ username: 'stock-racer', password: 'Demo123!', phone: '13800138014' })
    const firstOrder = await firstRepo.createOrder(user, [
      { productId: 'product-tasting', quantity: 2 },
      { productId: 'product-gift', quantity: 36 },
    ], contact, 'checkout-stock-first')
    const competingOrder = await secondRepo.createOrder(actorFor(competing.user), [
      { productId: 'product-gift', quantity: 36 },
    ], contact, 'checkout-stock-competing')
    await secondRepo.payOrder(actorFor(competing.user), competingOrder.id, 'SUCCESS')
    const tastingBefore = await firstRepo.getProduct('product-tasting')

    await expect(firstRepo.payOrder(user, firstOrder.id, 'SUCCESS')).rejects.toThrow('商品库存不足')

    expect((await firstRepo.getProduct('product-tasting')).stock).toBe(tastingBefore.stock)
    expect((await firstRepo.getOrder(user, firstOrder.id)).status).toBe('PENDING_PAYMENT')
  })

  it('does not duplicate stock or timeline entries on repeated successful payment', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { user } = await actors(repo)
    const order = await repo.createOrder(user, [{ productId: 'product-tasting', quantity: 2 }], contact, 'checkout-repeat-payment')
    const before = await repo.getProduct('product-tasting')

    const paid = await repo.payOrder(user, order.id, 'SUCCESS')
    const retried = await repo.payOrder(user, order.id, 'SUCCESS')

    expect(retried.timeline).toHaveLength(paid.timeline.length)
    expect((await repo.getProduct('product-tasting')).stock).toBe(before.stock - 2)
  })

  it('persists required idempotency keys while retaining legacy seeded orders', async () => {
    const storage = new MemoryStorage()
    const repo = createDemoRepository(storage)
    const { user } = await actors(repo)
    const order = await repo.createOrder(user, [{ productId: 'product-tasting', quantity: 1 }], contact, 'checkout-persisted-0001')
    const persisted = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as { data: DemoData }

    expect(order.idempotencyKey).toBe('checkout-persisted-0001')
    expect(persisted.data.orders.find(({ id }) => id === order.id)?.idempotencyKey).toBe('checkout-persisted-0001')
    expect(persisted.data.orders.find(({ id }) => id === 'order-shipped')?.idempotencyKey).toBeUndefined()
  })
})
