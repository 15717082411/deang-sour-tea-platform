import type {
  Actor,
  AfterSale,
  AuthSession,
  Booking,
  BookingInput,
  CartLine,
  ContentArticle,
  ContentInput,
  DashboardMetrics,
  LoginInput,
  MerchantApplication,
  MerchantApplicationInput,
  Order,
  OrderLine,
  Product,
  ProductDraftInput,
  ProductQuery,
  RegisterInput,
  User,
} from '../domain/types'
import { transitionAfterSale, transitionBooking, transitionOrder, transitionProduct } from '../domain/stateMachines'
import { createBusinessId } from '../utils/identifiers'
import { calculateCartTotal } from '../utils/money'
import { isValidPhone } from '../utils/validation'
import { RepositoryError, type OrderRequestLine, type PlatformRepository } from './repository'
import {
  createSeedData,
  DEMO_DATA_VERSION,
  DEMO_STORAGE_KEY,
  LEGACY_DEMO_STORAGE_KEY,
  migrateDemoDataV3,
  type DemoData,
} from './seed'

interface PersistedDemoData { version: number; data: DemoData }

const clone = <Value>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value
const now = (): string => new Date().toISOString()
function orderEvent(status: string, label: string, note?: string) {
  return { status, label, at: now(), ...(note === undefined ? {} : { note }) }
}

export function createDemoRepository(storage: Storage): PlatformRepository {
  const load = (): DemoData => {
    const serialized = storage.getItem(DEMO_STORAGE_KEY)
    if (serialized === null) {
      const legacySerialized = storage.getItem(LEGACY_DEMO_STORAGE_KEY)
      if (legacySerialized !== null) {
        try {
          const legacy = JSON.parse(legacySerialized) as PersistedDemoData
          if (legacy.version === 3 && legacy.data?.sessions !== undefined) {
            const data = migrateDemoDataV3(legacy.data)
            storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
            return data
          }
        } catch { /* invalid legacy data is restored from the current seed below */ }
      }
      const data = createSeedData()
      storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
      return data
    }
    try {
      const persisted = JSON.parse(serialized) as PersistedDemoData
      if (
        persisted.version === DEMO_DATA_VERSION
        && persisted.data !== undefined
        && persisted.data.sessions !== undefined
      ) return persisted.data
    } catch { /* invalid persisted data is restored below */ }
    const data = createSeedData()
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
    return data
  }

  let data = load()
  const persist = (): void => storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
  const userById = (userId: string): User => {
    const user = data.users.find((candidate) => candidate.id === userId)
    if (user === undefined) throw new Error('用户不存在')
    return user
  }
  const productById = (productId: string): Product => {
    const product = data.products.find((candidate) => candidate.id === productId)
    if (product === undefined) throw new Error('商品不存在')
    return product
  }
  const orderById = (orderId: string): Order => {
    const order = data.orders.find((candidate) => candidate.id === orderId)
    if (order === undefined) throw new Error('订单不存在')
    return order
  }
  const authenticatedActor = (actor: Actor): User => {
    const user = userById(actor.userId)
    if (user.role !== actor.role) throw new Error('角色身份无效')
    return user
  }
  const actorRole = (actor: Actor, role: Actor['role']): User => {
    const user = authenticatedActor(actor)
    if (actor.role !== role) throw new Error('无权执行此操作')
    return user
  }
  const merchantId = (actor: Actor): string => {
    const user = actorRole(actor, 'MERCHANT')
    if (user.merchantId === undefined || (actor.merchantId !== undefined && actor.merchantId !== user.merchantId)) throw new Error('商家身份无效')
    return user.merchantId
  }
  const ownsOrder = (actor: Actor, order: Order): void => {
    const user = authenticatedActor(actor)
    if (user.role === 'ADMIN') return
    if (user.role === 'USER' && order.userId === user.id) return
    if (user.role === 'MERCHANT' && merchantId(actor) === order.merchantId) return
    throw new Error('无权访问该订单')
  }
  const createSession = (user: User): AuthSession => {
    const sessionId = createBusinessId('SESSION')
    data.sessions[sessionId] = user.id
    persist()
    return { sessionId, user: clone(user) }
  }
  const validateCartLines = (lines: OrderRequestLine[], requireApproved: boolean): CartLine[] => {
    if (lines.length === 0) throw new Error('购物车不能为空')
    const seen = new Set<string>()
    const normalized = lines.map((line) => {
      if (!Number.isSafeInteger(line.quantity) || line.quantity <= 0 || seen.has(line.productId)) throw new Error('购物车商品无效')
      seen.add(line.productId)
      const product = productById(line.productId)
      if (requireApproved && product.status !== 'APPROVED') throw new Error('商品不可购买')
      if (line.quantity > product.stock) throw new Error('商品库存不足')
      return { productId: product.id, quantity: line.quantity, unitPriceCents: product.priceCents }
    })
    calculateCartTotal(normalized)
    return normalized
  }

  return {
    async login(input: LoginInput) {
      const user = data.users.find((candidate) => candidate.username === input.username)
      if (user === undefined || data.passwords[user.id] !== input.password) throw new Error('用户名或密码错误')
      return createSession(user)
    },
    async register(input: RegisterInput) {
      if (!input.username.trim() || !input.password || !isValidPhone(input.phone)) throw new Error('注册信息无效')
      if (data.users.some((user) => user.username === input.username)) throw new Error('用户名已存在')
      const user: User = { id: createBusinessId('USER'), username: input.username, displayName: input.displayName?.trim() || input.username, phone: input.phone, role: 'USER', merchantStatus: 'NONE' }
      data.users.push(user)
      data.passwords[user.id] = input.password
      persist()
      return createSession(user)
    },
    async validateSession(userId, sessionId) {
      if (data.sessions[sessionId] !== userId) throw new Error('会话无效')
      return { sessionId, user: clone(userById(userId)) }
    },
    async logout(sessionId) {
      if (data.sessions[sessionId] === undefined) return
      delete data.sessions[sessionId]
      persist()
    },
    async getUser(userId) { return clone(userById(userId)) },
    async listProducts(query?: ProductQuery) {
      let products = data.products.filter((product) => product.status === 'APPROVED')
      if (query?.keyword) products = products.filter((product) => `${product.name}${product.description}`.includes(query.keyword!))
      if (query?.category) products = products.filter((product) => product.category === query.category)
      if (query?.inStock) products = products.filter((product) => product.stock > 0)
      if (query?.sort === 'PRICE_ASC') products = [...products].sort((a, b) => a.priceCents - b.priceCents)
      if (query?.sort === 'PRICE_DESC') products = [...products].sort((a, b) => b.priceCents - a.priceCents)
      return clone(products)
    },
    async getProduct(productId) { return clone(productById(productId)) },
    async listContents() { return clone(data.contents.filter((content) => content.published)) },
    async getContent(slug) {
      const content = data.contents.find((candidate) => candidate.slug === slug && candidate.published)
      if (content === undefined) throw new RepositoryError('CONTENT_NOT_FOUND', '内容不存在')
      return clone(content)
    },
    async getCart(userId) { userById(userId); return clone(data.carts[userId] ?? []) },
    async saveCart(userId, lines) {
      userById(userId)
      data.carts[userId] = lines.length === 0 ? [] : validateCartLines(lines, true)
      persist()
      return clone(data.carts[userId])
    },
    async createOrder(userId, lines, contact) {
      userById(userId)
      if (!contact.recipient.trim() || !contact.address.trim() || !isValidPhone(contact.phone)) throw new Error('收货信息无效')
      const cartLines = validateCartLines(lines, true)
      const products = cartLines.map((line) => productById(line.productId))
      if (new Set(products.map((product) => product.merchantId)).size !== 1) throw new Error('订单仅支持单个商家')
      const orderLines: OrderLine[] = cartLines.map((line, index) => ({ ...line, productName: products[index].name, image: products[index].image }))
      const order: Order = { id: createBusinessId('ORDER'), orderNo: createBusinessId('DST'), userId, merchantId: products[0].merchantId, lines: orderLines, totalCents: calculateCartTotal(orderLines), status: 'PENDING_PAYMENT', contact: clone(contact), timeline: [orderEvent('PENDING_PAYMENT', '订单已创建')], createdAt: now() }
      data.orders.push(order)
      persist()
      return clone(order)
    },
    async listOrders(actor) {
      authenticatedActor(actor)
      const orders = actor.role === 'ADMIN' ? data.orders : actor.role === 'MERCHANT' ? data.orders.filter((order) => order.merchantId === merchantId(actor)) : data.orders.filter((order) => order.userId === actor.userId)
      return clone(orders)
    },
    async getOrder(actor, orderId) { const order = orderById(orderId); ownsOrder(actor, order); return clone(order) },
    async payOrder(orderId, result) {
      const order = orderById(orderId)
      if (order.status === 'PAID' && result === 'SUCCESS') return clone(order)
      const event = result === 'SUCCESS' ? 'PAY_SUCCESS' : result === 'FAILURE' ? 'PAY_FAILURE' : 'CANCEL'
      const nextStatus = transitionOrder(order.status, event)
      if (result === 'SUCCESS') {
        for (const line of order.lines) if (productById(line.productId).stock < line.quantity) throw new Error('商品库存不足')
        for (const line of order.lines) { const product = productById(line.productId); product.stock -= line.quantity; product.sales += line.quantity }
      }
      order.status = nextStatus
      order.timeline.push(orderEvent(nextStatus, result === 'SUCCESS' ? '支付成功' : result === 'FAILURE' ? '支付失败' : '订单已取消'))
      persist()
      return clone(order)
    },
    async shipOrder(actor, orderId) {
      const order = orderById(orderId)
      if (order.merchantId !== merchantId(actor)) throw new Error('无权操作该订单')
      order.status = transitionOrder(order.status, 'SHIP')
      order.timeline.push(orderEvent(order.status, '商家已发货'))
      persist()
      return clone(order)
    },
    async receiveOrder(actor, orderId) {
      const order = orderById(orderId)
      const user = actorRole(actor, 'USER')
      if (user.id !== order.userId) throw new Error('无权操作该订单')
      order.status = transitionOrder(order.status, 'RECEIVE')
      order.timeline.push(orderEvent(order.status, '用户已收货'))
      persist()
      return clone(order)
    },
    async listAfterSales(actor) {
      authenticatedActor(actor)
      const afterSales = actor.role === 'ADMIN' ? data.afterSales : actor.role === 'MERCHANT' ? data.afterSales.filter((afterSale) => afterSale.merchantId === merchantId(actor)) : data.afterSales.filter((afterSale) => afterSale.userId === actor.userId)
      return clone(afterSales)
    },
    async requestAfterSale(actor, orderId, reason) {
      const order = orderById(orderId)
      const user = actorRole(actor, 'USER')
      if (user.id !== order.userId || !reason.trim()) throw new Error('无权申请售后')
      if (data.afterSales.some((afterSale) => afterSale.orderId === orderId)) throw new Error('订单已有售后申请')
      order.status = transitionOrder(order.status, 'REQUEST_AFTER_SALE')
      order.timeline.push(orderEvent(order.status, '已申请售后', reason))
      const afterSale: AfterSale = { id: createBusinessId('AFTER_SALE'), orderId, userId: order.userId, merchantId: order.merchantId, reason, status: 'REQUESTED', timeline: [orderEvent('REQUESTED', '售后申请已提交', reason)] }
      data.afterSales.push(afterSale)
      persist()
      return clone(afterSale)
    },
    async resolveAfterSale(actor, afterSaleId, decision, note) {
      const afterSale = data.afterSales.find((candidate) => candidate.id === afterSaleId)
      if (afterSale === undefined) throw new Error('售后申请不存在')
      if (afterSale.merchantId !== merchantId(actor)) throw new Error('无权处理该售后')
      afterSale.status = transitionAfterSale(afterSale.status, 'PROCESS')
      afterSale.timeline.push(orderEvent(afterSale.status, '商家开始处理', note))
      afterSale.status = transitionAfterSale(afterSale.status, decision)
      afterSale.resolutionNote = note
      afterSale.timeline.push(orderEvent(afterSale.status, decision === 'APPROVE' ? '售后已通过' : '售后已拒绝', note))
      persist()
      return clone(afterSale)
    },
    async listBookings(actor) {
      authenticatedActor(actor)
      const bookings = actor.role === 'ADMIN' || actor.role === 'MERCHANT' ? data.bookings : data.bookings.filter((booking) => booking.userId === actor.userId)
      return clone(bookings)
    },
    async createBooking(actor, input: BookingInput) {
      actorRole(actor, 'USER')
      if (!input.date || !Number.isSafeInteger(input.people) || input.people <= 0 || !isValidPhone(input.phone)) throw new Error('预约信息无效')
      const booking: Booking = { id: createBusinessId('BOOKING'), userId: actor.userId, ...clone(input), code: createBusinessId('BOOK'), status: 'PENDING', createdAt: now() }
      data.bookings.push(booking)
      persist()
      return clone(booking)
    },
    async cancelBooking(actor, bookingId) {
      const booking = data.bookings.find((candidate) => candidate.id === bookingId)
      actorRole(actor, 'USER')
      if (booking === undefined || booking.userId !== actor.userId) throw new Error('无权取消该预约')
      booking.status = transitionBooking(booking.status, 'CANCEL')
      persist()
      return clone(booking)
    },
    async verifyBooking(actor, code) {
      merchantId(actor)
      const booking = data.bookings.find((candidate) => candidate.code === code)
      if (booking === undefined) throw new Error('预约核销码不存在')
      booking.status = transitionBooking(booking.status, 'VERIFY')
      persist()
      return clone(booking)
    },
    async getMerchantApplication(userId) { return clone([...data.merchantApplications].reverse().find((application) => application.userId === userId) ?? null) },
    async applyMerchant(actor, input: MerchantApplicationInput) {
      const user = actorRole(actor, 'USER')
      if (user.merchantStatus === 'PENDING' || data.merchantApplications.some((application) => application.userId === user.id && application.status === 'PENDING')) throw new Error('已有待审核申请')
      if (user.merchantStatus === 'APPROVED') throw new Error('已是商家')
      if (!input.shopName.trim() || !input.contact.trim() || !input.location.trim() || !input.introduction.trim()) throw new Error('申请信息无效')
      const application: MerchantApplication = { id: createBusinessId('MERCHANT_APPLICATION'), userId: user.id, ...clone(input), status: 'PENDING', createdAt: now() }
      user.merchantStatus = 'PENDING'
      data.merchantApplications.push(application)
      persist()
      return clone(application)
    },
    async listMerchantApplications(actor) { actorRole(actor, 'ADMIN'); return clone(data.merchantApplications) },
    async reviewMerchant(actor, applicationId, decision) {
      actorRole(actor, 'ADMIN')
      const application = data.merchantApplications.find((candidate) => candidate.id === applicationId)
      if (application === undefined || application.status !== 'PENDING') throw new Error('商家申请不可审核')
      application.status = decision.result === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      application.reviewReason = decision.reason
      const user = userById(application.userId)
      user.merchantStatus = application.status
      if (decision.result === 'APPROVE') { user.role = 'MERCHANT'; user.merchantId = createBusinessId('MERCHANT') }
      persist()
      return clone(application)
    },
    async saveProduct(actor, input: ProductDraftInput) {
      const owner = merchantId(actor)
      if (!input.name.trim() || !input.category.trim() || !input.description.trim() || !input.image.trim() || !Number.isSafeInteger(input.priceCents) || input.priceCents < 0 || !Number.isSafeInteger(input.stock) || input.stock < 0) throw new Error('商品信息无效')
      const existing = input.id === undefined ? undefined : productById(input.id)
      if (existing !== undefined && existing.merchantId !== owner) throw new Error('无权编辑该商品')
      const product: Product = existing ?? {
        id: createBusinessId('PRODUCT'),
        merchantId: owner,
        name: input.name,
        category: input.category,
        priceCents: input.priceCents,
        stock: input.stock,
        sales: 0,
        description: input.description,
        image: input.image,
        status: 'DRAFT',
      }
      if (existing?.status === 'REJECTED') product.status = transitionProduct(existing.status, 'EDIT')
      Object.assign(product, clone({ name: input.name, category: input.category, priceCents: input.priceCents, stock: input.stock, description: input.description, image: input.image }))
      if (existing === undefined) data.products.push(product)
      persist()
      return clone(product)
    },
    async submitProduct(actor, productId) {
      const product = productById(productId)
      if (product.merchantId !== merchantId(actor)) throw new Error('无权提交该商品')
      product.status = transitionProduct(product.status, 'SUBMIT')
      persist()
      return clone(product)
    },
    async reviewProduct(actor, productId, decision) {
      actorRole(actor, 'ADMIN')
      const product = productById(productId)
      product.status = transitionProduct(product.status, decision.result)
      product.reviewReason = decision.reason
      persist()
      return clone(product)
    },
    async saveContent(actor, input: ContentInput) {
      actorRole(actor, 'ADMIN')
      if (!input.title.trim() || !input.slug.trim() || data.contents.some((content) => content.slug === input.slug && content.id !== input.id)) throw new Error('内容信息无效')
      const existing = input.id === undefined ? undefined : data.contents.find((content) => content.id === input.id)
      if (input.id !== undefined && existing === undefined) throw new Error('内容不存在')
      const content: ContentArticle = existing ?? { id: createBusinessId('CONTENT'), cover: '' } as ContentArticle
      Object.assign(content, clone({ slug: input.slug, title: input.title, category: input.category, summary: input.summary, body: input.body, sources: input.sources, published: input.published }))
      if (existing === undefined) data.contents.push(content)
      persist()
      return clone(content)
    },
    async dashboard(actor): Promise<DashboardMetrics> {
      actorRole(actor, 'ADMIN')
      return clone({ revenueCents: data.orders.filter((order) => order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED').reduce((total, order) => total + order.totalCents, 0), orderCount: data.orders.length, productCount: data.products.length, bookingCount: data.bookings.length, afterSaleCount: data.afterSales.length })
    },
    async reset() { data = createSeedData(); persist() },
  }
}
