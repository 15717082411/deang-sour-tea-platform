import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppEmpty from '../../components/common/AppEmpty.vue'
import AppError from '../../components/common/AppError.vue'
import AppSkeleton from '../../components/common/AppSkeleton.vue'

describe('shared feedback states', () => {
  it('renders an actionable semantic empty state', () => {
    const wrapper = mount(AppEmpty, {
      props: { title: '暂无订单', description: '完成选购后可在这里查看。' },
      slots: { action: '<a href="/shop">去商城</a>' },
    })

    expect(wrapper.get('[data-state="empty"]').attributes('aria-labelledby')).toBeTruthy()
    expect(wrapper.text()).toContain('暂无订单')
    expect(wrapper.get('a').attributes('href')).toBe('/shop')
  })

  it('announces errors and emits retry', async () => {
    const wrapper = mount(AppError, { props: { message: '内容加载失败', retryable: true } })

    expect(wrapper.get('[role="alert"]').text()).toContain('内容加载失败')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('uses a stable busy region for skeleton rows', () => {
    const wrapper = mount(AppSkeleton, { props: { lines: 3, label: '正在加载订单' } })

    expect(wrapper.get('[aria-busy="true"]').attributes('aria-label')).toBe('正在加载订单')
    expect(wrapper.findAll('[data-skeleton-line]')).toHaveLength(3)
  })
})
