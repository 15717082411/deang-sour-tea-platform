import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PaymentPanel from '../../components/payment/PaymentPanel.vue'
import OrderSummaryPage from '../../pages/account/OrderSummaryPage.vue'
import CheckoutPage from '../../pages/shop/CheckoutPage.vue'
import PaymentPage from '../../pages/shop/PaymentPage.vue'
import { createAppRouter } from '../../router'
import type { Order } from '../../domain/types'
import { commerceSeed, contact, createCommerceContext } from './context'

function seedWithSecondUser() {
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
  return data
}

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((done) => { resolve = done })
  return { promise, resolve }
}

describe('commerce recovery pages and order isolation', () => {
  beforeEach(() => window.localStorage.clear())

  it('resets order state on account switch and logout', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const order = await context.repository.getOrder(context.auth.actor!, 'order-shipped')
    context.orders.remember(order)

    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    expect(context.orders.currentOrder).toBeNull()
    expect(context.orders.orders).toEqual([])

    context.orders.remember(order)
    await context.auth.logout()
    expect(context.orders.currentOrder).toBeNull()
    expect(context.orders.orders).toEqual([])
  })

  it('never renders a stale order when the current account cannot load the payment route', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const staleOrder = await context.repository.createOrder(
      context.auth.actor!,
      [{ productId: 'product-tasting', quantity: 1 }],
      contact,
      'checkout-stale-payment-page',
    )
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    context.orders.currentOrder = staleOrder
    const router = createAppRouter(context.pinia)
    await router.push(`/payment/${staleOrder.id}`)
    await router.isReady()

    const wrapper = mount(PaymentPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('无权')
    expect(wrapper.text()).not.toContain(staleOrder.orderNo)
    expect(wrapper.findComponent(PaymentPanel).exists()).toBe(false)
  })

  it('reloads the payment page when its route order id changes', async () => {
    const context = createCommerceContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const order = await context.repository.createOrder(
      context.auth.actor!,
      [{ productId: 'product-tasting', quantity: 1 }],
      contact,
      'checkout-payment-route-change',
    )
    const router = createAppRouter(context.pinia)
    await router.push(`/payment/${order.id}`)
    await router.isReady()
    const wrapper = mount(PaymentPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain(order.orderNo)

    await router.push('/payment/order-does-not-exist')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('订单不存在')
    expect(wrapper.text()).not.toContain(order.orderNo)
    expect(wrapper.findComponent(PaymentPanel).exists()).toBe(false)
  })

  it('reloads order summary when the route id changes and hides the previous metadata on error', async () => {
    const context = createCommerceContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const router = createAppRouter(context.pinia)
    await router.push('/account/orders/order-shipped')
    await router.isReady()
    const wrapper = mount(OrderSummaryPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('DST-20260713-001')

    await router.push('/account/orders/order-does-not-exist')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('订单不存在')
    expect(wrapper.text()).not.toContain('DST-20260713-001')
  })

  it('only commits the latest order load when requests resolve out of order', async () => {
    const context = createCommerceContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const firstOrder = await context.repository.getOrder(context.auth.actor!, 'order-shipped')
    const secondOrder = await context.repository.getOrder(context.auth.actor!, 'order-after-sale')
    const first = deferred<Order>()
    const second = deferred<Order>()
    vi.spyOn(context.repository, 'getOrder').mockImplementation((_actor, orderId) => (
      orderId === firstOrder.id ? first.promise : second.promise
    ))

    const firstLoad = context.orders.loadOrder(firstOrder.id)
    const secondLoad = context.orders.loadOrder(secondOrder.id)
    second.resolve(secondOrder)
    await secondLoad
    first.resolve(firstOrder)
    await firstLoad

    expect(context.orders.currentOrder?.id).toBe(secondOrder.id)
  })

  it('distinguishes a recoverable checkout load error from a missing merchant group', async () => {
    const data = commerceSeed()
    data.carts['user-demo'] = [{ productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 }]
    const context = createCommerceContext(data)
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    vi.spyOn(context.repository, 'getCart').mockRejectedValueOnce(new Error('购物车服务暂时不可用'))
    const router = createAppRouter(context.pinia)
    await router.push('/checkout?merchant=merchant-demo-shop')
    await router.isReady()
    const wrapper = mount(CheckoutPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="checkout-load-error"]').text()).toContain('购物车服务暂时不可用')
    expect(wrapper.find('[data-testid="checkout-missing-group"]').exists()).toBe(false)

    await wrapper.get('[data-testid="checkout-load-error"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="checkout-load-error"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="checkout-products"]').text()).toContain('45天发酵酸茶体验装')

    await router.push('/checkout?merchant=missing-merchant')
    await flushPromises()
    expect(wrapper.get('[data-testid="checkout-missing-group"]').text()).toContain('没有可结算的商家商品')
    expect(wrapper.find('[data-testid="checkout-load-error"]').exists()).toBe(false)
  })

  it('shows every invalid checkout line and blocks checkout until a real recheck succeeds', async () => {
    const data = commerceSeed()
    data.carts['user-demo'] = [{ productId: 'product-tasting', quantity: 5, unitPriceCents: 5900 }]
    data.products.find(({ id }) => id === 'product-tasting')!.stock = 2
    const context = createCommerceContext(data)
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const checkout = vi.spyOn(context.orders, 'checkout')
    const router = createAppRouter(context.pinia)
    await router.push('/checkout?merchant=merchant-demo-shop')
    await router.isReady()
    const wrapper = mount(CheckoutPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="checkout-invalid-reason"]').text()).toContain('库存仅剩 2 件')
    expect(wrapper.get('[data-testid="checkout-invalid-actions"]').text()).toContain('返回购物车')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')
    expect(checkout).not.toHaveBeenCalled()
  })
})
