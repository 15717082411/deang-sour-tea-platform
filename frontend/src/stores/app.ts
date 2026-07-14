import { defineStore } from 'pinia'
import { markRaw, ref, shallowRef } from 'vue'
import { createApiClient } from '../data/apiClient'
import { createApiRepository } from '../data/apiRepository'
import { createDemoRepository } from '../data/demoRepository'
import type { PlatformRepository } from '../data/repository'
import {
  createRepositoryGateway,
  type RepositoryGateway,
  type RepositoryMode,
} from '../data/repositoryGateway'

export type AppMode = RepositoryMode

function createDefaultGateway(): RepositoryGateway {
  return createRepositoryGateway({
    api: createApiRepository(createApiClient()),
    demo: createDemoRepository(globalThis.localStorage),
    apiCapabilities: ['content'],
  })
}

export const useAppStore = defineStore('app', () => {
  let gateway = markRaw(createDefaultGateway())
  const mode = ref<AppMode>(gateway.mode.value)
  const capabilities = ref({ ...gateway.capabilities.value })
  const repository = shallowRef<PlatformRepository>(markRaw(gateway.repository))
  const mobileNavigationOpen = ref(false)

  function syncGatewayState(): void {
    mode.value = gateway.mode.value
    capabilities.value = { ...gateway.capabilities.value }
  }

  function setRepository(nextRepository: PlatformRepository): void {
    repository.value = markRaw(nextRepository)
  }

  function setGateway(nextGateway: RepositoryGateway): void {
    gateway = markRaw(nextGateway)
    repository.value = markRaw(nextGateway.repository)
    syncGatewayState()
  }

  async function detectApi(): Promise<AppMode> {
    const detectedMode = await gateway.detectApi()
    syncGatewayState()
    return detectedMode
  }

  async function switchToDemo(confirmed: boolean): Promise<void> {
    await gateway.switchToDemo(confirmed)
    syncGatewayState()
  }

  function openMobileNavigation(): void {
    mobileNavigationOpen.value = true
  }

  function closeMobileNavigation(): void {
    mobileNavigationOpen.value = false
  }

  return {
    mode,
    capabilities,
    repository,
    mobileNavigationOpen,
    setRepository,
    setGateway,
    detectApi,
    switchToDemo,
    openMobileNavigation,
    closeMobileNavigation,
  }
})
