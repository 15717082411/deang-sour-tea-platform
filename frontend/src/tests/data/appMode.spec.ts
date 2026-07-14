import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModeBanner from '../../components/common/ModeBanner.vue'
import { createDemoRepository } from '../../data/demoRepository'
import { createRepositoryGateway } from '../../data/repositoryGateway'
import { useAppStore } from '../../stores/app'

function createModeContext(apiAvailable: boolean) {
  const pinia = createPinia()
  const demo = createDemoRepository(window.localStorage)
  const api = createDemoRepository(window.localStorage)
  let available = apiAvailable
  vi.spyOn(api, 'listProducts').mockImplementation(async () => {
    if (!available) throw new Error('offline')
    return []
  })
  const gateway = createRepositoryGateway({ api, demo, apiCapabilities: ['content'] })
  const app = useAppStore(pinia)
  app.setGateway(gateway)
  return { app, gateway, pinia, setApiAvailable: (value: boolean) => { available = value } }
}

describe('application repository mode', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('publishes honest hybrid capability status after API detection', async () => {
    const { app } = createModeContext(true)

    await app.detectApi()

    expect(app.mode).toBe('hybrid')
    expect(app.capabilities.content).toBe('api')
    expect(app.capabilities.orders).toBe('demo')
  })

  it('shows offline mode and can retry API detection', async () => {
    const { app, gateway, pinia, setApiAvailable } = createModeContext(false)
    const detect = vi.spyOn(gateway, 'detectApi')
    const wrapper = mount(ModeBanner, { global: { plugins: [pinia] } })

    expect(wrapper.text()).toContain('离线演示模式')
    setApiAvailable(true)
    await wrapper.get('[data-testid="retry-api"]').trigger('click')
    await flushPromises()

    expect(detect).toHaveBeenCalledOnce()
    expect(app.mode).toBe('hybrid')
  })

  it('requires confirmation before switching a hybrid session to demo', async () => {
    const { app, pinia } = createModeContext(true)
    await app.detectApi()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(ModeBanner, { global: { plugins: [pinia] } })

    expect(wrapper.text()).toContain('API 已连接 · 部分闭环为演示数据')
    await wrapper.get('[data-testid="switch-to-demo"]').trigger('click')
    expect(app.mode).toBe('hybrid')

    confirm.mockReturnValue(true)
    await wrapper.get('[data-testid="switch-to-demo"]').trigger('click')
    await flushPromises()
    expect(app.mode).toBe('demo')
  })
})
