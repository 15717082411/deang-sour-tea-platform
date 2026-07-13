import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import PaymentPanel from '../../components/payment/PaymentPanel.vue'
import { contact, createCommerceContext } from './context'

async function pendingOrder() {
  const context = createCommerceContext()
  await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
  await context.catalog.load()
  await context.cart.load()
  await context.cart.add('product-tasting', 2)
  const order = await context.orders.checkout('merchant-demo-shop', contact)
  return { ...context, order }
}

describe('simulated payment', () => {
  beforeEach(() => window.localStorage.clear())

  it('keeps failure pending and allows a successful retry', async () => {
    const context = await pendingOrder()
    const failed = await context.orders.pay(context.order.id, 'FAILURE')
    const paid = await context.orders.pay(context.order.id, 'SUCCESS')

    expect(failed.status).toBe('PENDING_PAYMENT')
    expect(failed.timeline[failed.timeline.length - 1]?.label).toBe('支付失败')
    expect(paid.status).toBe('PAID')
  })

  it('makes cancellation terminal and repeated success stock/timeline idempotent', async () => {
    const cancelledContext = await pendingOrder()
    const cancelled = await cancelledContext.orders.pay(cancelledContext.order.id, 'CANCEL')
    expect(cancelled.status).toBe('CANCELLED')
    await expect(cancelledContext.orders.pay(cancelled.id, 'SUCCESS')).rejects.toThrow()

    window.localStorage.clear()
    const paidContext = await pendingOrder()
    const paid = await paidContext.orders.pay(paidContext.order.id, 'SUCCESS')
    const stock = (await paidContext.repository.getProduct('product-tasting')).stock
    const repeated = await paidContext.orders.pay(paid.id, 'SUCCESS')
    expect(repeated.timeline).toHaveLength(paid.timeline.length)
    expect((await paidContext.repository.getProduct('product-tasting')).stock).toBe(stock)
  })

  it('labels the simulation and disables all three results while pending', async () => {
    const wrapper = mount(PaymentPanel, { props: { pending: true } })

    expect(wrapper.text()).toContain('模拟支付')
    expect(wrapper.findAll('button')).toHaveLength(3)
    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)

    await wrapper.setProps({ pending: false })
    await wrapper.get('[data-result="FAILURE"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('pay')?.[0]).toEqual(['FAILURE'])
  })
})
