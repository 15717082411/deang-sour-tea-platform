import { readonly, ref, type Ref } from 'vue'
import type { PlatformRepository } from './repository'

export type RepositoryCapability =
  | 'auth'
  | 'catalog'
  | 'content'
  | 'orders'
  | 'bookings'
  | 'merchantReview'
  | 'productReview'
  | 'dashboard'
  | 'payment'
  | 'receipt'
  | 'afterSales'

export type RepositoryMode = 'demo' | 'hybrid'
type CapabilitySources = Record<RepositoryCapability, 'api' | 'demo'>

export interface RepositoryGateway {
  mode: Readonly<Ref<RepositoryMode>>
  capabilities: Readonly<Ref<CapabilitySources>>
  repository: PlatformRepository
  detectApi(): Promise<RepositoryMode>
  switchToDemo(confirmed: boolean): Promise<void>
}

export class ModeSwitchConfirmationError extends Error {
  constructor() {
    super('切换到离线演示模式前需要用户确认')
    this.name = 'ModeSwitchConfirmationError'
  }
}

const capabilityNames: RepositoryCapability[] = [
  'auth', 'catalog', 'content', 'orders', 'bookings', 'merchantReview', 'productReview', 'dashboard', 'payment', 'receipt', 'afterSales',
]

const methodCapabilities: Partial<Record<keyof PlatformRepository, RepositoryCapability>> = {
  login: 'auth', register: 'auth', validateSession: 'auth', logout: 'auth', getUser: 'auth',
  listProducts: 'catalog', getProduct: 'catalog', getCart: 'orders', saveCart: 'orders', mergeCart: 'orders',
  listContents: 'content', getContent: 'content',
  createOrder: 'orders', listOrders: 'orders', getOrder: 'orders', shipOrder: 'orders',
  payOrder: 'payment', receiveOrder: 'receipt',
  listAfterSales: 'afterSales', requestAfterSale: 'afterSales', resolveAfterSale: 'afterSales', refundAfterSale: 'afterSales',
  listBookings: 'bookings', createBooking: 'bookings', cancelBooking: 'bookings', verifyBooking: 'bookings',
  getMerchantApplication: 'merchantReview', applyMerchant: 'merchantReview', listMerchantApplications: 'merchantReview', reviewMerchant: 'merchantReview',
  listMerchantProducts: 'productReview', listAdminProducts: 'productReview', saveProduct: 'productReview', submitProduct: 'productReview', reviewProduct: 'productReview',
  dashboard: 'dashboard',
}

function allDemoSources(): CapabilitySources {
  return Object.fromEntries(capabilityNames.map((name) => [name, 'demo'])) as CapabilitySources
}

export function createRepositoryGateway(options: {
  api: PlatformRepository
  demo: PlatformRepository
  apiCapabilities?: RepositoryCapability[]
}): RepositoryGateway {
  const mode = ref<RepositoryMode>('demo')
  const capabilities = ref<CapabilitySources>(allDemoSources())
  const safeApiCapabilities = new Set(options.apiCapabilities ?? ['content'])

  const repository = new Proxy({} as PlatformRepository, {
    get(_target, property: string | symbol) {
      if (typeof property !== 'string') return undefined
      const method = property as keyof PlatformRepository
      const capability = methodCapabilities[method]
      const source = mode.value === 'hybrid' && capability !== undefined && capabilities.value[capability] === 'api'
        ? options.api
        : options.demo
      const value = source[method]
      return typeof value === 'function' ? value.bind(source) : value
    },
  })

  return {
    mode: readonly(mode),
    capabilities: readonly(capabilities),
    repository,
    async detectApi() {
      try {
        await options.api.listContents()
        mode.value = 'hybrid'
        capabilities.value = Object.fromEntries(capabilityNames.map((name) => [name, safeApiCapabilities.has(name) ? 'api' : 'demo'])) as CapabilitySources
      } catch {
        mode.value = 'demo'
        capabilities.value = allDemoSources()
      }
      return mode.value
    },
    async switchToDemo(confirmed) {
      if (mode.value === 'hybrid' && !confirmed) throw new ModeSwitchConfirmationError()
      mode.value = 'demo'
      capabilities.value = allDemoSources()
    },
  }
}
