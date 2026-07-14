import type {
  AfterSale,
  AuthSession,
  Booking,
  BookingInput,
  ContentArticle,
  ContentInput,
  ContentSource,
  DashboardMetrics,
  MerchantApplication,
  Order,
  OrderContact,
  OrderLine,
  OrderStatus,
  Product,
  ProductDraftInput,
  ProductQuery,
  ProductStatus,
  ReviewDecision,
  User,
} from '../domain/types'
import { ApiBusinessError, type ApiHttpClient, requestApiData } from './apiClient'
import type { PlatformRepository } from './repository'

type RawRecord = Record<string, unknown>

export class ApiCapabilityError extends Error {
  constructor(capability: string) {
    super(`当前 Spring Boot API 尚未提供完整的${capability}能力`)
    this.name = 'ApiCapabilityError'
  }
}

const productStatuses = new Set<ProductStatus>(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'OFF_SHELF'])
const orderStatuses = new Set<OrderStatus>(['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELLED'])

function record(value: unknown): RawRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ApiBusinessError(-1, 'API 数据结构无效')
  return value as RawRecord
}

function records(value: unknown): RawRecord[] {
  if (!Array.isArray(value)) throw new ApiBusinessError(-1, 'API 列表结构无效')
  return value.map(record)
}

function id(value: unknown, label = '资源'): string {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new ApiBusinessError(-1, `${label} ID 无效`)
    return String(value)
  }
  if (typeof value !== 'string' || value.trim() === '') throw new ApiBusinessError(-1, `${label} ID 无效`)
  return value.trim()
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function integer(value: unknown, fallback?: number): number {
  if (value === undefined && fallback !== undefined) return fallback
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?\d+$/.test(value))) {
    throw new ApiBusinessError(-1, 'API 整数字段无效')
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isSafeInteger(parsed)) throw new ApiBusinessError(-1, 'API 整数超出安全范围')
  return parsed
}

export function yuanToCents(value: unknown): number {
  if (typeof value === 'number') {
    const cents = Math.round(value * 100)
    if (!Number.isSafeInteger(cents) || Math.abs(value * 100 - cents) > 1e-7) throw new ApiBusinessError(-1, 'API 金额精度无效')
    return cents
  }
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d{1,2})?$/.test(value)) throw new ApiBusinessError(-1, 'API 金额格式无效')
  const negative = value.startsWith('-')
  const normalized = negative ? value.slice(1) : value
  const [yuan, fraction = ''] = normalized.split('.')
  const cents = Number(yuan) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents)) throw new ApiBusinessError(-1, 'API 金额超出安全范围')
  return negative ? -cents : cents
}

function normalizeProduct(value: unknown): Product {
  const raw = record(value)
  const status = text(raw.status, 'APPROVED') as ProductStatus
  if (!productStatuses.has(status)) throw new ApiBusinessError(-1, 'API 商品状态无效')
  const priceCents = raw.priceCents === undefined ? yuanToCents(raw.price) : integer(raw.priceCents)
  return {
    id: id(raw.id, '商品'),
    merchantId: id(raw.merchantId ?? 'api-merchant', '商家'),
    merchantName: text(raw.merchantName, 'API 酸茶商家'),
    name: text(raw.name, '酸茶商品'),
    category: text(raw.category, '酸茶产品'),
    priceCents,
    stock: integer(raw.stock),
    sales: integer(raw.sales, 0),
    description: text(raw.description, '由 Spring Boot API 提供的德昂族酸茶商品。'),
    image: text(raw.image, '/images/product-tasting.webp'),
    status,
    ...(text(raw.reviewReason) ? { reviewReason: text(raw.reviewReason) } : {}),
  }
}

function normalizeSources(value: unknown): ContentSource[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const source = record(item)
    return {
      title: text(source.title),
      publisher: text(source.publisher),
      url: text(source.url),
      claim: text(source.claim),
    }
  })
}

function normalizeContent(value: unknown): ContentArticle {
  const raw = record(value)
  const contentId = id(raw.id, '内容')
  const summary = text(raw.summary)
  return {
    id: contentId,
    slug: text(raw.slug, `api-content-${contentId}`),
    title: text(raw.title, '德昂族酸茶资料'),
    category: text(raw.category, '酸茶科普'),
    summary,
    body: text(raw.body, summary),
    cover: text(raw.cover, '/images/hero-sour-tea.webp'),
    sources: normalizeSources(raw.sources),
    published: typeof raw.published === 'boolean' ? raw.published : text(raw.status, 'PUBLISHED') === 'PUBLISHED',
  }
}

function normalizeOrderLine(value: unknown): OrderLine {
  const raw = record(value)
  return {
    productId: id(raw.productId, '商品'),
    productName: text(raw.productName, '酸茶商品'),
    image: text(raw.image, '/images/product-tasting.webp'),
    quantity: integer(raw.quantity, 1),
    unitPriceCents: raw.unitPriceCents === undefined ? yuanToCents(raw.price ?? 0) : integer(raw.unitPriceCents),
  }
}

function normalizeOrder(value: unknown): Order {
  const raw = record(value)
  const status = text(raw.status, 'PENDING_PAYMENT') as OrderStatus
  if (!orderStatuses.has(status)) throw new ApiBusinessError(-1, 'API 订单状态无效')
  const createdAt = text(raw.createdAt, '1970-01-01T00:00:00')
  const rawContact = typeof raw.contact === 'object' && raw.contact !== null ? record(raw.contact) : {}
  const lines = Array.isArray(raw.lines)
    ? raw.lines.map(normalizeOrderLine)
    : Array.isArray(raw.productIds)
      ? raw.productIds.map((productId) => normalizeOrderLine({ productId, quantity: 1, price: 0 }))
      : []
  return {
    id: id(raw.id, '订单'),
    orderNo: text(raw.orderNo, id(raw.id, '订单')),
    userId: id(raw.userId ?? 'api-user', '用户'),
    merchantId: id(raw.merchantId ?? 'api-merchant', '商家'),
    lines,
    totalCents: raw.totalCents === undefined ? yuanToCents(raw.totalAmount ?? 0) : integer(raw.totalCents),
    status,
    contact: {
      recipient: text(rawContact.recipient, 'API 用户'),
      phone: text(rawContact.phone),
      address: text(rawContact.address),
    },
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((item) => {
          const event = record(item)
          return { status: text(event.status), label: text(event.label), at: text(event.at, createdAt), ...(text(event.note) ? { note: text(event.note) } : {}) }
        })
      : [{ status, label: 'API 订单状态', at: createdAt }],
    createdAt,
    ...(text(raw.idempotencyKey) ? { idempotencyKey: text(raw.idempotencyKey) } : {}),
  }
}

function normalizeBooking(value: unknown): Booking {
  const raw = record(value)
  const status = text(raw.status, 'PENDING') as Booking['status']
  const createdAt = text(raw.createdAt, '1970-01-01T00:00:00')
  return {
    id: id(raw.id, '预约'),
    userId: id(raw.userId ?? 'api-user', '用户'),
    date: text(raw.date ?? raw.bookingDate),
    people: integer(raw.people ?? raw.peopleCount, 1),
    phone: text(raw.phone),
    code: text(raw.code ?? raw.verifyCode),
    status,
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map((item) => {
          const event = record(item)
          return { status: text(event.status), label: text(event.label), at: text(event.at, createdAt) }
        })
      : [{ status, label: 'API 预约状态', at: createdAt }],
    createdAt,
    ...(text(raw.posterId) ? { posterId: text(raw.posterId) } : {}),
    ...(text(raw.verifiedAt) ? { verifiedAt: text(raw.verifiedAt) } : {}),
    ...(text(raw.verifiedBy) ? { verifiedBy: text(raw.verifiedBy) } : {}),
  }
}

function normalizeMerchantApplication(value: unknown): MerchantApplication {
  const raw = record(value)
  const status = text(raw.status ?? raw.auditStatus, 'PENDING') as MerchantApplication['status']
  return {
    id: id(raw.id, '商家申请'),
    userId: id(raw.userId ?? raw.id, '用户'),
    shopName: text(raw.shopName, 'API 酸茶商家'),
    contact: text(raw.contact),
    location: text(raw.location, '云南省德宏州'),
    introduction: text(raw.introduction, '由 Spring Boot API 提供的商家申请。'),
    status,
    createdAt: text(raw.createdAt, '1970-01-01T00:00:00'),
    ...(text(raw.reviewReason) ? { reviewReason: text(raw.reviewReason) } : {}),
  }
}

function unsupported(capability: string): never {
  throw new ApiCapabilityError(capability)
}

export function createApiRepository(client: ApiHttpClient): PlatformRepository {
  let currentSession: AuthSession | null = null
  return {
    async login(input) {
      const raw = record(await requestApiData(client.post('/auth/login', input)))
      const token = text(raw.token)
      if (!token) throw new ApiBusinessError(-1, 'API 登录响应缺少令牌')
      const rawUser = typeof raw.user === 'object' && raw.user !== null ? record(raw.user) : raw
      const role = text(rawUser.role ?? raw.role, 'USER') as User['role']
      const user: User = {
        id: id(rawUser.id ?? rawUser.userId ?? text(rawUser.username, 'api-user'), '用户'),
        username: text(rawUser.username, input.username),
        displayName: text(rawUser.displayName ?? raw.nickname, input.username),
        phone: text(rawUser.phone),
        role,
        merchantStatus: text(rawUser.merchantStatus, role === 'MERCHANT' ? 'APPROVED' : 'NONE') as User['merchantStatus'],
        ...(rawUser.merchantId === undefined ? {} : { merchantId: id(rawUser.merchantId, '商家') }),
      }
      client.setToken?.(token)
      currentSession = { sessionId: token, user }
      return currentSession
    },
    async register() { return unsupported('注册') },
    async validateSession(userId, sessionId) {
      if (currentSession?.user.id === userId && currentSession.sessionId === sessionId) return structuredClone(currentSession)
      return unsupported('会话校验')
    },
    async logout() { client.setToken?.(null); currentSession = null },
    async getUser(userId) {
      if (currentSession?.user.id === userId) return structuredClone(currentSession.user)
      return unsupported('用户资料')
    },
    async listProducts(query?: ProductQuery) {
      return records(await requestApiData(client.get('/products', { params: query }))).map(normalizeProduct)
    },
    async getProduct(productId) {
      const products = await this.listProducts()
      const product = products.find(({ id: candidate }) => candidate === productId)
      if (!product) throw new ApiBusinessError(404, '商品不存在')
      return product
    },
    async listContents() { return records(await requestApiData(client.get('/contents'))).map(normalizeContent).filter(({ published }) => published) },
    async getContent(slug) {
      const contents = await this.listContents()
      const content = contents.find(({ slug: candidate }) => candidate === slug)
      if (!content) throw new ApiBusinessError(404, '内容不存在')
      return content
    },
    async getCart() { return unsupported('购物车') },
    async saveCart() { return unsupported('购物车') },
    async mergeCart() { return unsupported('购物车') },
    async createOrder(_actor, lines, contact: OrderContact, idempotencyKey) {
      return normalizeOrder(await requestApiData(client.post('/orders', { lines, contact, idempotencyKey })))
    },
    async listOrders() { return records(await requestApiData(client.get('/orders'))).map(normalizeOrder) },
    async getOrder(_actor, orderId) { return normalizeOrder(await requestApiData(client.get(`/orders/${encodeURIComponent(orderId)}`))) },
    async payOrder() { return unsupported('支付') },
    async shipOrder(_actor, orderId) { return normalizeOrder(await requestApiData(client.post(`/orders/${encodeURIComponent(orderId)}/ship`))) },
    async receiveOrder() { return unsupported('确认收货') },
    async listAfterSales() { return unsupported('售后') as AfterSale[] },
    async requestAfterSale() { return unsupported('售后') },
    async resolveAfterSale() { return unsupported('售后') },
    async refundAfterSale() { return unsupported('售后') },
    async listBookings() { return records(await requestApiData(client.get('/bookings'))).map(normalizeBooking) },
    async createBooking(_actor, input: BookingInput) { return normalizeBooking(await requestApiData(client.post('/bookings', { ...input, peopleCount: input.people }))) },
    async cancelBooking() { return unsupported('预约取消') },
    async verifyBooking(_actor, code) { return normalizeBooking(await requestApiData(client.post('/bookings/verify', { code }))) },
    async getMerchantApplication() { return unsupported('商家申请') },
    async applyMerchant() { return unsupported('商家申请') },
    async listMerchantProducts() { return records(await requestApiData(client.get('/products/mine'))).map(normalizeProduct) },
    async listMerchantApplications() { return records(await requestApiData(client.get('/merchants'))).map(normalizeMerchantApplication) },
    async listAdminProducts() { return records(await requestApiData(client.get('/admin/products'))).map(normalizeProduct) },
    async listAdminContents() { return records(await requestApiData(client.get('/admin/contents'))).map(normalizeContent) },
    async reviewMerchant(_actor, applicationId, decision: ReviewDecision) {
      return normalizeMerchantApplication(await requestApiData(client.post(`/admin/merchants/${encodeURIComponent(applicationId)}/review`, decision)))
    },
    async saveProduct(_actor, input: ProductDraftInput) {
      return normalizeProduct(await requestApiData(client.post('/products', { ...input, price: (input.priceCents / 100).toFixed(2) })))
    },
    async submitProduct(_actor, productId) { return normalizeProduct(await requestApiData(client.post(`/products/${encodeURIComponent(productId)}/submit`))) },
    async reviewProduct(_actor, productId, decision: ReviewDecision) {
      return normalizeProduct(await requestApiData(client.post(`/admin/products/${encodeURIComponent(productId)}/review`, decision)))
    },
    async saveContent(_actor, input: ContentInput) { return normalizeContent(await requestApiData(client.post('/contents', input))) },
    async dashboard(): Promise<DashboardMetrics> {
      const raw = record(await requestApiData(client.get('/dashboard')))
      return {
        revenueCents: raw.revenueCents === undefined ? yuanToCents(raw.revenue ?? 0) : integer(raw.revenueCents),
        orderCount: integer(raw.orderCount ?? raw.orders),
        productCount: integer(raw.productCount ?? raw.products),
        bookingCount: integer(raw.bookingCount ?? raw.bookings),
        afterSaleCount: integer(raw.afterSaleCount ?? raw.afterSales),
      }
    },
    async reset() { return unsupported('远端数据重置') },
  }
}
