import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import AdminBookingsPage from '../../pages/admin/AdminBookingsPage.vue'
import { createAppRouter } from '../../router'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

describe('admin booking verification UI', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows invalid, successful and already-used verification results', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useAppStore(pinia).setRepository(createDemoRepository(window.localStorage))
    await useAuthStore(pinia).login({ username: 'admin_demo', password: 'Demo123!' })
    const router = createAppRouter(pinia)
    await router.push('/admin/bookings')
    const wrapper = mount(AdminBookingsPage, { global: { plugins: [pinia, router] } })
    await flushPromises()

    const code = wrapper.get('input[name="verificationCode"]')
    await code.setValue('BOOK-MISSING-01')
    await wrapper.get('[data-testid="verify-booking"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('不存在')

    await code.setValue('BOOK-DEMO-01')
    await wrapper.get('[data-testid="verify-booking"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('核销成功')

    await code.setValue('BOOK-DEMO-01')
    await wrapper.get('[data-testid="verify-booking"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('已使用')
  })
})
