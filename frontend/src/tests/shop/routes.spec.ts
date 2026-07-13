import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppRouter } from '../../router'
import OrderSummaryPage from '../../pages/account/OrderSummaryPage.vue'
import { contact, createCommerceContext } from './context'

describe('commerce routes and order detail', () => {
  beforeEach(() => window.localStorage.clear())

  it('uses lazy real pages and USER-only checkout/payment metadata', () => {
    const context = createCommerceContext()
    const router = createAppRouter(context.pinia)
    const named = new Map(router.getRoutes().map((route) => [route.name, route]))

    for (const name of ['shop', 'product-detail', 'cart', 'checkout', 'payment', 'account-order-detail']) {
      expect(typeof named.get(name)?.components?.default).toBe('function')
    }
    expect(named.get('checkout')?.meta).toMatchObject({ requiresAuth: true, roles: ['USER'] })
    expect(named.get('payment')?.meta).toMatchObject({ requiresAuth: true, roles: ['USER'] })
    expect(named.get('account-order-detail')?.meta.roles).toEqual(['USER'])
  })

  it('renders a real pending order summary with a working continue-payment entry', async () => {
    const context = createCommerceContext()
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()
    await context.cart.add('product-tasting', 1)
    const order = await context.orders.checkout('merchant-demo-shop', contact)
    const router = createAppRouter(context.pinia)
    await router.push(`/account/orders/${order.id}`)
    await router.isReady()

    const wrapper = mount(OrderSummaryPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.text()).toContain('45天发酵酸茶体验装')
    expect(wrapper.text()).toContain('结算用户')
    expect(wrapper.text()).toContain('订单已创建')
    expect(wrapper.get(`a[href="/payment/${order.id}"]`).text()).toContain('继续支付')
  })

  it('denies merchant and admin access to checkout and payment routes', async () => {
    for (const username of ['merchant_demo', 'admin_demo']) {
      window.localStorage.clear()
      const context = createCommerceContext()
      await context.auth.login({ username, password: 'Demo123!' })
      const router = createAppRouter(context.pinia)
      await router.push('/checkout')
      expect(router.currentRoute.value.path).toBe('/403')
      await router.push('/payment/order-shipped')
      expect(router.currentRoute.value.path).toBe('/403')
    }
  })
})
