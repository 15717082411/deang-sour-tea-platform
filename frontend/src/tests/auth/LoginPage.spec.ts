import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import AppHeader from '../../components/common/AppHeader.vue'
import { createDemoRepository } from '../../data/demoRepository'
import LoginPage from '../../pages/auth/LoginPage.vue'
import RegisterPage from '../../pages/auth/RegisterPage.vue'
import { createAppRouter } from '../../router'
import { useAppStore } from '../../stores/app'

function createPageContext(path: string) {
  const pinia = createPinia()
  useAppStore(pinia).setRepository(createDemoRepository(window.localStorage))
  const router = createAppRouter(pinia)
  return { pinia, router, ready: router.push(path) }
}

describe('authentication pages', () => {
  beforeEach(() => window.localStorage.clear())

  it('replaces to a validated internal redirect after login', async () => {
    const context = createPageContext('/login?redirect=/account')
    await context.ready
    const wrapper = mount(LoginPage, { global: { plugins: [context.pinia, context.router] } })

    await wrapper.get('[name="username"]').setValue('user_demo')
    await wrapper.get('[name="password"]').setValue('Demo123!')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(context.router.currentRoute.value.path).toBe('/account')
  })

  it('reports repository login failures without navigating', async () => {
    const context = createPageContext('/login')
    await context.ready
    const wrapper = mount(LoginPage, { global: { plugins: [context.pinia, context.router] } })

    await wrapper.get('[name="username"]').setValue('user_demo')
    await wrapper.get('[name="password"]').setValue('incorrect')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('用户名或密码错误')
    expect(context.router.currentRoute.value.path).toBe('/login')
  })

  it('reports registration failures from the repository', async () => {
    const context = createPageContext('/register')
    await context.ready
    const wrapper = mount(RegisterPage, { global: { plugins: [context.pinia, context.router] } })

    await wrapper.get('[name="username"]').setValue('user_demo')
    await wrapper.get('[name="password"]').setValue('Demo123!')
    await wrapper.get('[name="phone"]').setValue('13800138000')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('用户名已存在')
  })

  it('opens and closes the labelled mobile navigation drawer', async () => {
    const context = createPageContext('/')
    await context.ready
    const wrapper = mount(AppHeader, { global: { plugins: [context.pinia, context.router] } })

    expect(wrapper.find('[data-testid="mobile-navigation"]').exists()).toBe(false)
    await wrapper.get('[aria-label="打开导航菜单"]').trigger('click')
    expect(wrapper.get('[data-testid="mobile-navigation"]').text()).toContain('酸茶商城')
    await wrapper.get('[aria-label="关闭导航菜单"]').trigger('click')
    expect(wrapper.find('[data-testid="mobile-navigation"]').exists()).toBe(false)
  })
})
