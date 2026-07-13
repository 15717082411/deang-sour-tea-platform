import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('rejects cross-merchant and stale-stock checkout requests', async () => {
    const context = await readyUserCart()

    await expect(context.orders.checkout('missing-merchant', contact)).rejects.toThrow()
    await context.cart.setQuantity('product-tasting', 80)
    const product = await context.repository.getProduct('product-tasting')
    const seed = JSON.parse(window.localStorage.getItem('deang-sour-tea:v4') ?? '{}')
    seed.data.products.find((candidate: { id: string }) => candidate.id === product.id).stock = 1
    window.localStorage.setItem('deang-sour-tea:v4', JSON.stringify(seed))

    await expect(context.orders.checkout('merchant-demo-shop', contact)).rejects.toThrow('库存')
  })
})
