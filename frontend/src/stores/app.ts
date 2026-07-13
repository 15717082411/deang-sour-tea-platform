import { defineStore } from 'pinia'
import { createDemoRepository } from '../data/demoRepository'
import type { PlatformRepository } from '../data/repository'

export type AppMode = 'demo'

export const useAppStore = defineStore('app', {
  state: () => ({
    mode: 'demo' as AppMode,
    repository: createDemoRepository(window.localStorage) as PlatformRepository,
    mobileNavigationOpen: false,
  }),
  actions: {
    setRepository(repository: PlatformRepository) {
      this.repository = repository
    },
    openMobileNavigation() {
      this.mobileNavigationOpen = true
    },
    closeMobileNavigation() {
      this.mobileNavigationOpen = false
    },
  },
})
