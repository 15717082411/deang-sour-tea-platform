import { createPinia } from 'pinia'
import { createDemoRepository } from '../../data/demoRepository'
import { createSeedData, DEMO_DATA_VERSION, DEMO_STORAGE_KEY, type DemoData } from '../../data/seed'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'
import { useCartStore } from '../../stores/cart'
import { useCatalogStore } from '../../stores/catalog'
import { useOrdersStore } from '../../stores/orders'

export const contact = {
  recipient: '结算用户',
  phone: '13800138000',
  address: '云南省德宏州芒市酸茶路 7 号',
}

export function commerceSeed(): DemoData {
  const data = createSeedData()
  data.products.push({
    id: 'product-other-merchant',
    merchantId: 'merchant-other-shop',
    merchantName: '山野酸茶铺',
    name: '山野酸茶随行装',
    category: '体验装',
    priceCents: 7200,
    stock: 12,
    sales: 0,
    description: '用于验证单商家结算边界。',
    image: '/images/product-tasting.webp',
    status: 'APPROVED',
  })
  return data
}

export function writeDemoData(data: DemoData): void {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
}

export function createCommerceContext(data = commerceSeed()) {
  writeDemoData(data)
  const pinia = createPinia()
  const repository = createDemoRepository(window.localStorage)
  useAppStore(pinia).setRepository(repository)
  return {
    pinia,
    repository,
    auth: useAuthStore(pinia),
    catalog: useCatalogStore(pinia),
    cart: useCartStore(pinia),
    orders: useOrdersStore(pinia),
  }
}
