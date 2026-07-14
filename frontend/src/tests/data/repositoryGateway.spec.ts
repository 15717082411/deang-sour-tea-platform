import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoRepository } from '../../data/demoRepository'
import { ModeSwitchConfirmationError, createRepositoryGateway } from '../../data/repositoryGateway'
import type { PlatformRepository } from '../../data/repository'

describe('repository mode gateway', () => {
  beforeEach(() => window.localStorage.clear())

  function repositories() {
    const demo = createDemoRepository(window.localStorage)
    const api = {
      ...demo,
      listProducts: vi.fn(demo.listProducts),
      listContents: vi.fn(async () => [{ ...(await demo.listContents())[0], title: 'API 酸茶内容' }]),
    } satisfies PlatformRepository
    return { api, demo }
  }

  it('enters explicit hybrid mode after a successful product probe', async () => {
    const { api, demo } = repositories()
    const gateway = createRepositoryGateway({ api, demo })

    await expect(gateway.detectApi()).resolves.toBe('hybrid')

    expect(gateway.mode.value).toBe('hybrid')
    expect(gateway.capabilities.value.content).toBe('api')
    expect(gateway.capabilities.value.catalog).toBe('demo')
    expect((await gateway.repository.listContents())[0].title).toBe('API 酸茶内容')
    expect(api.listProducts).toHaveBeenCalledTimes(1)
  })

  it('keeps admin content operations in the demo repository', async () => {
    const { api, demo } = repositories()
    const apiAdminContents = vi.spyOn(api, 'listAdminContents').mockResolvedValue([])
    const demoAdminContents = vi.spyOn(demo, 'listAdminContents')
    const gateway = createRepositoryGateway({ api, demo })
    await gateway.detectApi()

    await gateway.repository.listAdminContents({ userId: 'admin-demo', role: 'ADMIN' })

    expect(apiAdminContents).not.toHaveBeenCalled()
    expect(demoAdminContents).toHaveBeenCalledOnce()
  })

  it('keeps full demo mode when the API probe fails', async () => {
    const { api, demo } = repositories()
    vi.mocked(api.listProducts).mockRejectedValue(new Error('offline'))
    const gateway = createRepositoryGateway({ api, demo })

    await expect(gateway.detectApi()).resolves.toBe('demo')

    expect(gateway.mode.value).toBe('demo')
    expect(Object.values(gateway.capabilities.value).every((source) => source === 'demo')).toBe(true)
  })

  it('requires confirmation before switching a connected session to demo', async () => {
    const { api, demo } = repositories()
    const gateway = createRepositoryGateway({ api, demo })
    await gateway.detectApi()

    await expect(gateway.switchToDemo(false)).rejects.toBeInstanceOf(ModeSwitchConfirmationError)
    expect(gateway.mode.value).toBe('hybrid')

    await gateway.switchToDemo(true)
    expect(gateway.mode.value).toBe('demo')
    expect((await gateway.repository.listContents())[0].title).not.toBe('API 酸茶内容')
  })
})
