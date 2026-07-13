import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductDetailPage from '../../pages/shop/ProductDetailPage.vue'
import ShopPage from '../../pages/shop/ShopPage.vue'
import { createAppRouter } from '../../router'
import { createCommerceContext } from './context'

describe('commerce pages', () => {
  beforeEach(() => window.localStorage.clear())

  it('filters, sorts, resets and renders an honest empty result in the shop', async () => {
    const context = createCommerceContext()
    const router = createAppRouter(context.pinia)
    await router.push('/shop')
    await router.isReady()
    const wrapper = mount(ShopPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.findAll('[data-testid="product-card"]')).toHaveLength(3)
    await wrapper.get('[name="keyword"]').setValue('礼盒')
    expect(wrapper.findAll('[data-testid="product-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('德昂古树酸茶礼盒')

    await wrapper.get('[name="keyword"]').setValue('不存在的商品')
    expect(wrapper.text()).toContain('没有符合条件的商品')
    await wrapper.get('[aria-label="重置筛选"]').trigger('click')
    await wrapper.get('[name="sort"]').setValue('PRICE_DESC')
    expect(wrapper.findAll('[data-testid="product-card"]')[0].text()).toContain('德昂古树酸茶礼盒')
  })

  it('shows a recoverable shop loading error', async () => {
    const context = createCommerceContext()
    vi.spyOn(context.repository, 'listProducts').mockRejectedValueOnce(new Error('目录暂时不可用'))
    const router = createAppRouter(context.pinia)
    await router.push('/shop')
    await router.isReady()
    const wrapper = mount(ShopPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('目录暂时不可用')
    expect(wrapper.get('[role="alert"] button').text()).toContain('重新加载')
  })

  it('renders an inspectable product image, merchant, stock and purchase controls', async () => {
    const context = createCommerceContext()
    const router = createAppRouter(context.pinia)
    await router.push('/shop/product-tasting')
    await router.isReady()
    const wrapper = mount(ProductDetailPage, { global: { plugins: [context.pinia, router] } })
    await flushPromises()

    expect(wrapper.get('img').attributes('alt')).toBe('45天发酵酸茶体验装')
    expect(wrapper.text()).toContain('商家：酸茶工坊')
    expect(wrapper.text()).toContain('库存 80 件')
    expect(wrapper.get('[aria-label="数量"]')).toBeTruthy()
    expect(wrapper.text()).toContain('加入购物车')
    expect(wrapper.text()).toContain('立即购买')
  })
})
