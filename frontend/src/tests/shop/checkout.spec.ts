import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_STORAGE_KEY } from '../../data/seed'
import { contact, createCommerceContext } from './context'

async function readyUserCart() {
  const context = createCommerceContext()
  await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
  await context.catalog.load()
  await context.cart.load()
  await context.cart.add('product-tasting', 2)
  await context.cart.add('product-other-merchant', 1)
  return context
}

describe('checkout store', () => {
  beforeEach(() => window.localStorage.clear())

  it('validates recipient, mainland phone and address before repository creation', async () => {
    const context = await readyUserCart()
    const createOrder = vi.spyOn(context.repository, 'createOrder')

    await expect(context.orders.checkout('merchant-demo-shop', { ...contact, recipient: ' ' })).rejects.toThrow('收件人')
    await expect(context.orders.checkout('merchant-demo-shop', { ...contact, phone: '123' })).rejects.toThrow('手机号')
    await expect(context.orders.checkout('merchant-demo-shop', { ...contact, address: ' ' })).rejects.toThrow('地址')
    expect(createOrder).not.toHaveBeenCalled()
  })

  it('shares one in-flight promise and one stable idempotency key for double checkout', async () => {
    const context = await readyUserCart()
    const createOrder = vi.spyOn(context.repository, 'createOrder')

    const first = context.orders.checkout('merchant-demo-shop', contact)
    const second = context.orders.checkout('merchant-demo-shop', contact)

    const [firstOrder, secondOrder] = await Promise.all([first, second])
    expect(secondOrder.id).toBe(firstOrder.id)
    expect(createOrder).toHaveBeenCalledTimes(1)
    expect(createOrder.mock.calls[0][3]).toMatch(/^CHECKOUT-/)
  })

  it('removes only the purchased merchant group after order creation succeeds', async () => {
    const context = await readyUserCart()

    const order = await context.orders.checkout('merchant-demo-shop', contact)

    expect(order.merchantId).toBe('merchant-demo-shop')
    expect(context.cart.items.map(({ productId }) => productId)).toEqual(['product-other-merchant'])
  })

  it('does not clear any cart line when order creation fails', async () => {
    const context = await readyUserCart()
    vi.spyOn(context.repository, 'createOrder').mockRejectedValueOnce(new Error('模拟创建失败'))

    await expect(context.orders.checkout('merchant-demo-shop', contact)).rejects.toThrow('模拟创建失败')

    expect(context.cart.items.map(({ productId }) => productId)).toEqual([
      'product-tasting',
      'product-other-merchant',
    ])
  })

  it('reuses the created order and stable key when cart cleanup fails then succeeds on retry', async () => {
    const context = await readyUserCart()
    const createOrder = vi.spyOn(context.repository, 'createOrder')
    const saveCart = vi.spyOn(context.repository, 'saveCart')
    saveCart.mockRejectedValueOnce(new Error('购物车暂时无法保存'))

    await expect(context.orders.checkout('merchant-demo-shop', contact)).rejects.toThrow('购物车暂时无法保存')

    const persistedAfterFailure = await context.repository.listOrders(context.auth.actor!)
    const created = persistedAfterFailure.find(({ id }) => !['order-shipped', 'order-after-sale'].includes(id))
    expect(created).toBeDefined()
    expect(context.cart.items.map(({ productId }) => productId)).toEqual([
      'product-tasting',
      'product-other-merchant',
    ])

    const retried = await context.orders.checkout('merchant-demo-shop', contact)

    expect(retried.id).toBe(created?.id)
    expect(createOrder).toHaveBeenCalledTimes(2)
    expect(createOrder.mock.calls[1][3]).toBe(createOrder.mock.calls[0][3])
    expect((await context.repository.listOrders(context.auth.actor!)).filter(({ id }) => id === retried.id)).toHaveLength(1)
    expect(context.cart.items.map(({ productId }) => productId)).toEqual(['product-other-merchant'])
  })

  it('does not restore an old account order when the account switches during cart cleanup', async () => {
    const context = await readyUserCart()
    const other = await context.repository.register({
      username: 'checkout-switch-user',
      password: 'Demo123!',
      phone: '13800138015',
    })
    let resolveSave!: (lines: Awaited<ReturnType<typeof context.repository.saveCart>>) => void
    const delayedSave = new Promise<Awaited<ReturnType<typeof context.repository.saveCart>>>((resolve) => { resolveSave = resolve })
    const saveCart = vi.spyOn(context.repository, 'saveCart').mockReturnValueOnce(delayedSave)

    const checkout = context.orders.checkout('merchant-demo-shop', contact)
    await vi.waitFor(() => expect(saveCart).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: other.user.username, password: 'Demo123!' })
    resolveSave([{ productId: 'product-other-merchant', quantity: 1, unitPriceCents: 7200 }])

    await expect(checkout).rejects.toThrow('账号已切换')
    expect(context.orders.currentOrder).toBeNull()
    expect(context.orders.orders).toEqual([])
  })

  it('rejects cross-merchant and stale-stock checkout requests', async () => {
    const context = await readyUserCart()

    await expect(context.orders.checkout('missing-merchant', contact)).rejects.toThrow()
    await context.cart.setQuantity('product-tasting', 80)
    const product = await context.repository.getProduct('product-tasting')
    const seed = JSON.parse(window.localStorage.getItem(DEMO_STORAGE_KEY) ?? '{}')
    seed.data.products.find((candidate: { id: string }) => candidate.id === product.id).stock = 1
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed))

    await expect(context.orders.checkout('merchant-demo-shop', contact)).rejects.toThrow('库存')
  })
})
