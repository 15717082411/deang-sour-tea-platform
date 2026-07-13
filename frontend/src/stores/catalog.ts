import { defineStore } from 'pinia'
import type { Product } from '../domain/types'
import { useAppStore } from './app'

export const useCatalogStore = defineStore('catalog', {
  state: () => ({
    products: [] as Product[],
    loading: false,
    error: null as string | null,
  }),
  getters: {
    categories: (state): string[] => [...new Set(state.products.map(({ category }) => category))].sort(),
    productById: (state) => (productId: string): Product | undefined => state.products.find(({ id }) => id === productId),
  },
  actions: {
    upsert(product: Product) {
      const index = this.products.findIndex(({ id }) => id === product.id)
      if (index === -1) this.products.push(product)
      else this.products[index] = product
    },
    async load() {
      this.loading = true
      this.error = null
      try {
        this.products = await useAppStore().repository.listProducts()
        return this.products
      } catch (error) {
        this.error = error instanceof Error ? error.message : '商品加载失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    async refreshProducts(productIds: readonly string[]) {
      const uniqueIds = [...new Set(productIds)]
      await Promise.all(uniqueIds.map(async (productId) => {
        try {
          this.upsert(await useAppStore().repository.getProduct(productId))
        } catch {
          this.products = this.products.filter(({ id }) => id !== productId)
        }
      }))
    },
    async get(productId: string): Promise<Product> {
      const product = await useAppStore().repository.getProduct(productId)
      this.upsert(product)
      return product
    },
  },
})
