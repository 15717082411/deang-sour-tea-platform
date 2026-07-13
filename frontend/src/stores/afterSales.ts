import { defineStore } from 'pinia'
import type { AfterSale } from '../domain/types'
import { useAppStore } from './app'
import { useAuthStore } from './auth'

export const useAfterSalesStore = defineStore('after-sales', {
  state: () => ({
    afterSales: [] as AfterSale[],
    currentAfterSale: null as AfterSale | null,
    loading: false,
    submitting: false,
    error: null as string | null,
    actorEpoch: 0,
    loadSequence: 0,
    mutationSequence: 0,
  }),
  actions: {
    resetForActorChange() {
      this.afterSales = []
      this.currentAfterSale = null
      this.loading = false
      this.submitting = false
      this.error = null
      this.actorEpoch += 1
      this.loadSequence += 1
      this.mutationSequence += 1
    },
    remember(afterSale: AfterSale) {
      const index = this.afterSales.findIndex(({ id }) => id === afterSale.id)
      if (index === -1) this.afterSales.unshift(afterSale)
      else this.afterSales[index] = afterSale
      this.currentAfterSale = afterSale
    },
    async load(): Promise<AfterSale[]> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权查看售后')
      const actor = auth.actor
      const epoch = this.actorEpoch
      const sequence = ++this.loadSequence
      const ownsState = () => this.actorEpoch === epoch
        && this.loadSequence === sequence
        && auth.actor?.userId === actor.userId
        && auth.actor.role === actor.role
      this.loading = true
      this.error = null
      try {
        const afterSales = await useAppStore().repository.listAfterSales(actor)
        if (!ownsState()) throw new Error('登录账号已切换，请重新加载售后')
        this.afterSales = afterSales
        return afterSales
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '售后加载失败'
        throw error
      } finally {
        if (ownsState()) this.loading = false
      }
    },
    async request(orderId: string, reason: string): Promise<AfterSale> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权申请售后')
      const actor = auth.actor
      const epoch = this.actorEpoch
      const sequence = ++this.mutationSequence
      const ownsState = () => this.actorEpoch === epoch
        && this.mutationSequence === sequence
        && auth.actor?.userId === actor.userId
        && auth.actor.role === actor.role
      this.submitting = true
      this.error = null
      try {
        const afterSale = await useAppStore().repository.requestAfterSale(actor, orderId, reason)
        if (!ownsState()) throw new Error('登录账号已切换，请重新申请售后')
        this.remember(afterSale)
        return afterSale
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '售后申请失败'
        throw error
      } finally {
        if (ownsState()) this.submitting = false
      }
    },
  },
})
