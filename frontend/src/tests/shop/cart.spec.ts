import { beforeEach, describe, expect, it } from 'vitest'
import { GUEST_CART_STORAGE_KEY } from '../../utils/guestCart'
import { commerceSeed, createCommerceContext, writeDemoData } from './context'

describe('cart store', () => {
  beforeEach(() => window.localStorage.clear())

  it('merges duplicate additions, caps quantity at stock and totals integer cents', async () => {
    const { catalog, cart } = createCommerceContext()
    await catalog.load()
    await cart.load()

    await cart.add('product-tasting', 70)
    await cart.add('product-tasting', 20)

    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]).toMatchObject({ productId: 'product-tasting', quantity: 80, unitPriceCents: 5900 })
    expect(cart.subtotalCents).toBe(472000)
    expect(JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? '{}').lines).toEqual([
      { productId: 'product-tasting', quantity: 80 },
    ])
  })

  it('binds a signed-in cart to the current actor and joins the latest catalog price', async () => {
    const context = createCommerceContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()
    await context.cart.add('product-tasting', 2)

    const changed = commerceSeed()
    changed.carts['user-demo'] = [{ productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 }]
    changed.products.find(({ id }) => id === 'product-tasting')!.priceCents = 6101
    writeDemoData(changed)
    await context.catalog.load()

    expect(context.cart.items[0].unitPriceCents).toBe(6101)
    expect(context.cart.subtotalCents).toBe(12202)
    expect(context.cart.boundUserId).toBe('user-demo')
  })

  it('loads the target account before its first write after an account switch', async () => {
    const data = commerceSeed()
    data.users.push({
      id: 'user-b',
      username: 'user_b',
      displayName: '账号 B',
      phone: '13800138009',
      role: 'USER',
      merchantStatus: 'NONE',
    })
    data.passwords['user-b'] = 'Demo123!'
    data.carts['user-demo'] = [{ productId: 'product-gift', quantity: 1, unitPriceCents: 16800 }]
    data.carts['user-b'] = [{ productId: 'product-tasting', quantity: 3, unitPriceCents: 5900 }]
    const context = createCommerceContext(data)

    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.cart.load()
    expect(context.cart.items.map(({ productId, quantity }) => ({ productId, quantity }))).toEqual([
      { productId: 'product-gift', quantity: 1 },
    ])

    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    await context.cart.add('product-tasting', 2)

    const actorB = context.auth.actor!
    expect(await context.repository.getCart(actorB)).toEqual([
      { productId: 'product-tasting', quantity: 5, unitPriceCents: 5900 },
    ])
    const actorA = { userId: 'user-demo', role: 'USER' } as const
    expect(await context.repository.getCart(actorA)).toEqual([
      { productId: 'product-gift', quantity: 1, unitPriceCents: 16800 },
    ])
  })

  it('groups lines by merchant and reports lines invalidated by current stock', async () => {
    const context = createCommerceContext()
    await context.catalog.load()
    await context.cart.load()
    await context.cart.add('product-tasting', 3)
    await context.cart.add('product-other-merchant', 2)

    expect(context.cart.groups.map(({ merchantId }) => merchantId)).toEqual([
      'merchant-demo-shop',
      'merchant-other-shop',
    ])

    const changed = commerceSeed()
    changed.products.find(({ id }) => id === 'product-tasting')!.stock = 1
    writeDemoData(changed)
    await context.catalog.load()

    expect(context.cart.items.find(({ productId }) => productId === 'product-tasting')?.invalidReason).toContain('库存')
  })
})
