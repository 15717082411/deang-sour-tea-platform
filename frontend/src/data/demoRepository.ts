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
import { normalizePosterKey, readJourneyPosterStorage } from './posterStorage'
import { RepositoryError, type CartRequestLine, type PlatformRepository } from './repository'
import {
  createSeedData,
  DEMO_DATA_VERSION,
  DEMO_STORAGE_KEY,
  LEGACY_DEMO_STORAGE_KEY,
  migrateDemoDataV3,
  migrateDemoDataV4,
  migrateDemoDataV5,
  type DemoData,
  V3_DEMO_STORAGE_KEY,
  V4_DEMO_STORAGE_KEY,
} from './seed'

const clone = <Value>(value: Value): Value => JSON.parse(JSON.stringify(value)) as Value
export type DemoClock = () => Date

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const demoDataArrayFields = [
  'users',
  'products',
  'contents',
  'orders',
  'afterSales',
  'bookings',
  'merchantApplications',
] as const

function isDemoData(value: unknown): value is DemoData {
  if (!isRecord(value)) return false
  if (!demoDataArrayFields.every((field) => (
    Array.isArray(value[field]) && value[field].every(isRecord)
  ))) return false
  if (!isRecord(value.passwords) || !isRecord(value.sessions) || !isRecord(value.carts)) return false
  if (!Object.values(value.carts).every((cart) => Array.isArray(cart) && cart.every(isRecord))) return false
  const orders = value.orders
  return Array.isArray(orders) && orders.every((order: unknown) => (
    isRecord(order) && Array.isArray(order.lines) && order.lines.every(isRecord)
  ))
}

function hasVersionedDemoData(value: unknown, version: number): value is { version: number; data: DemoData } {
  return isRecord(value) && value.version === version && isDemoData(value.data)
}

export function createDemoRepository(storage: Storage, clock: DemoClock = () => new Date()): PlatformRepository {
  const now = (): string => clock().toISOString()
  const orderEvent = (status: string, label: string, note?: string) => ({
    status,
    label,
    at: now(),
    ...(note === undefined ? {} : { note }),
  })
  const load = (): DemoData => {
    const serialized = storage.getItem(DEMO_STORAGE_KEY)
    if (serialized === null) {
      const legacySerialized = storage.getItem(LEGACY_DEMO_STORAGE_KEY)
      if (legacySerialized !== null) {
        try {
          const legacy: unknown = JSON.parse(legacySerialized)
          if (hasVersionedDemoData(legacy, 5)) {
            const data = migrateDemoDataV5(legacy.data)
            storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
            return data
          }
        } catch { /* try the older legacy key below */ }
      }
      const v4Serialized = storage.getItem(V4_DEMO_STORAGE_KEY)
      if (v4Serialized !== null) {
        try {
          const legacy: unknown = JSON.parse(v4Serialized)
          if (hasVersionedDemoData(legacy, 4)) {
            const data = migrateDemoDataV5(migrateDemoDataV4(legacy.data))
            storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
            return data
          }
        } catch { /* try the older legacy key below */ }
      }
      const v3Serialized = storage.getItem(V3_DEMO_STORAGE_KEY)
      if (v3Serialized !== null) {
        try {
          const legacy: unknown = JSON.parse(v3Serialized)
          if (hasVersionedDemoData(legacy, 3)) {
            const data = migrateDemoDataV5(migrateDemoDataV4(migrateDemoDataV3(legacy.data)))
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
      const persisted: unknown = JSON.parse(serialized)
      if (hasVersionedDemoData(persisted, DEMO_DATA_VERSION)) return persisted.data
    } catch { /* invalid persisted data is restored below */ }
    const data = createSeedData()
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: DEMO_DATA_VERSION, data }))
    return data
  }

  let data = load()
  const refresh = (): void => { data = load() }
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
    if (order === undefined) throw new RepositoryError('ORDER_NOT_FOUND', '订单不存在')
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
  const userActor = (actor: Actor): User => actorRole(actor, 'USER')
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
    throw new RepositoryError('ORDER_FORBIDDEN', '无权访问该订单')
  }
  const createSession = (user: User): AuthSession => {
    const sessionId = createBusinessId('SESSION')
    data.sessions[sessionId] = user.id
    persist()
    return { sessionId, user: clone(user) }
  }
  const validateCartLines = (lines: CartRequestLine[], requireApproved: boolean): CartLine[] => {
    if (lines.length === 0) throw new Error('购物车不能为空')
    const seen = new Set<string>()
    const normalized = lines.map((line) => {
      if (typeof line.productId !== 'string' || !line.productId.trim() || !Number.isSafeInteger(line.quantity) || line.quantity <= 0 || seen.has(line.productId)) throw new Error('购物车商品无效')
      seen.add(line.productId)
      const product = productById(line.productId)
      if (requireApproved && product.status !== 'APPROVED') throw new Error('商品不可购买')
      if (line.quantity > product.stock) throw new Error('商品库存不足')
      return { productId: product.id, quantity: line.quantity, unitPriceCents: product.priceCents }
    })
    calculateCartTotal(normalized)
    return normalized
  }
  const productForRead = (product: Product): Product => {
    const owner = data.users.find((user) => user.merchantId === product.merchantId)
    return clone({ ...product, merchantName: product.merchantName ?? owner?.displayName ?? '酸茶工坊' })
  }
  const validateIdempotencyKey = (key: string): void => {
    if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key)) throw new Error('幂等键格式无效')
  }
  const afterSaleById = (afterSaleId: string): AfterSale => {
    const afterSale = data.afterSales.find((candidate) => candidate.id === afterSaleId)
    if (afterSale === undefined) throw new RepositoryError('AFTER_SALE_NOT_FOUND', '售后申请不存在')
    return afterSale
  }
  const bookingById = (bookingId: string): Booking => {
    const booking = data.bookings.find((candidate) => candidate.id === bookingId)
    if (booking === undefined) throw new RepositoryError('BOOKING_NOT_FOUND', '预约不存在')
    return booking
  }
  const bookingUser = (actor: Actor): User => {
    const user = authenticatedActor(actor)
    if (user.role !== 'USER') throw new RepositoryError('BOOKING_FORBIDDEN', '当前身份无权操作预约')
    return user
  }
  const bookingAdmin = (actor: Actor): User => {
    const user = authenticatedActor(actor)
    if (user.role !== 'ADMIN') throw new RepositoryError('BOOKING_FORBIDDEN', '仅管理员可以核销预约')
    return user
  }
  const localDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const isStrictCalendarDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const [year, month, day] = value.split('-').map(Number)
    const parsed = new Date(year, month - 1, day)
    return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
  }
  const isValidSourceUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }

  return {
    async login(input: LoginInput) {
      refresh()
      const user = data.users.find((candidate) => candidate.username === input.username)
      if (user === undefined || data.passwords[user.id] !== input.password) throw new Error('用户名或密码错误')
      return createSession(user)
    },
    async register(input: RegisterInput) {
      refresh()
      if (!input.username.trim() || !input.password || !isValidPhone(input.phone)) throw new Error('注册信息无效')
      if (data.users.some((user) => user.username === input.username)) throw new Error('用户名已存在')
      const user: User = { id: createBusinessId('USER'), username: input.username, displayName: input.displayName?.trim() || input.username, phone: input.phone, role: 'USER', merchantStatus: 'NONE' }
      data.users.push(user)
      data.passwords[user.id] = input.password
      persist()
      return createSession(user)
    },
    async validateSession(userId, sessionId) {
      refresh()
      if (data.sessions[sessionId] !== userId) throw new Error('会话无效')
      return { sessionId, user: clone(userById(userId)) }
    },
    async logout(sessionId) {
      refresh()
      if (data.sessions[sessionId] === undefined) return
      delete data.sessions[sessionId]
      persist()
    },
    async getUser(userId) { refresh(); return clone(userById(userId)) },
    async listProducts(query?: ProductQuery) {
      refresh()
      let products = data.products.filter((product) => product.status === 'APPROVED')
      if (query?.keyword) products = products.filter((product) => `${product.name}${product.description}`.includes(query.keyword!))
      if (query?.category) products = products.filter((product) => product.category === query.category)
      if (query?.inStock) products = products.filter((product) => product.stock > 0)
      if (query?.sort === 'PRICE_ASC') products = [...products].sort((a, b) => a.priceCents - b.priceCents)
      if (query?.sort === 'PRICE_DESC') products = [...products].sort((a, b) => b.priceCents - a.priceCents)
      return products.map(productForRead)
    },
    async getProduct(productId) {
      refresh()
      const product = data.products.find((candidate) => candidate.id === productId && candidate.status === 'APPROVED')
      if (product === undefined) throw new RepositoryError('PRODUCT_NOT_FOUND', '商品不存在或暂未上架')
      return productForRead(product)
    },
    async listContents() { refresh(); return clone(data.contents.filter((content) => content.published)) },
    async getContent(slug) {
      refresh()
      const content = data.contents.find((candidate) => candidate.slug === slug && candidate.published)
      if (content === undefined) throw new RepositoryError('CONTENT_NOT_FOUND', '内容不存在')
      return clone(content)
    },
    async getCart(actor) {
      refresh()
      const user = userActor(actor)
      return clone(data.carts[user.id] ?? [])
    },
    async saveCart(actor, lines) {
      refresh()
      const user = userActor(actor)
      data.carts[user.id] = lines.length === 0 ? [] : validateCartLines(lines, true)
      persist()
      return clone(data.carts[user.id])
    },
    async mergeCart(actor, guestLines) {
      refresh()
      const user = userActor(actor)
      const quantities = new Map<string, number>()
      for (const line of [...(data.carts[user.id] ?? []), ...guestLines]) {
        if (typeof line.productId !== 'string' || !line.productId.trim() || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) throw new Error('购物车商品无效')
        const product = productById(line.productId)
        if (product.status !== 'APPROVED' || product.stock <= 0) throw new Error('商品不可购买')
        const current = quantities.get(product.id) ?? 0
        const combined = current + line.quantity
        if (!Number.isSafeInteger(combined)) throw new Error('购物车商品无效')
        quantities.set(product.id, Math.min(combined, product.stock))
      }
      const merged = [...quantities].map(([productId, quantity]) => {
        const product = productById(productId)
        return { productId, quantity, unitPriceCents: product.priceCents }
      })
      calculateCartTotal(merged)
      data.carts[user.id] = merged
      persist()
      return clone(merged)
    },
    async createOrder(actor, lines, contact, idempotencyKey) {
      refresh()
      const user = userActor(actor)
      validateIdempotencyKey(idempotencyKey)
      const existing = data.orders.find((order) => order.userId === user.id && order.idempotencyKey === idempotencyKey)
      if (existing !== undefined) return clone(existing)
      if (!contact.recipient.trim() || !contact.address.trim() || !isValidPhone(contact.phone)) throw new Error('收货信息无效')
      const cartLines = validateCartLines(lines, true)
      const products = cartLines.map((line) => productById(line.productId))
      if (new Set(products.map((product) => product.merchantId)).size !== 1) throw new Error('订单仅支持单个商家')
      const orderLines: OrderLine[] = cartLines.map((line, index) => ({ ...line, productName: products[index].name, image: products[index].image }))
      const order: Order = { id: createBusinessId('ORDER'), orderNo: createBusinessId('DST'), userId: user.id, merchantId: products[0].merchantId, lines: orderLines, totalCents: calculateCartTotal(orderLines), status: 'PENDING_PAYMENT', contact: clone(contact), timeline: [orderEvent('PENDING_PAYMENT', '订单已创建')], createdAt: now(), idempotencyKey }
      data.orders.push(order)
      persist()
      return clone(order)
    },
    async listOrders(actor) {
      refresh()
      authenticatedActor(actor)
      const orders = actor.role === 'ADMIN' ? data.orders : actor.role === 'MERCHANT' ? data.orders.filter((order) => order.merchantId === merchantId(actor)) : data.orders.filter((order) => order.userId === actor.userId)
      return clone(orders)
    },
    async getOrder(actor, orderId) { refresh(); const order = orderById(orderId); ownsOrder(actor, order); return clone(order) },
    async payOrder(actor, orderId, result) {
      refresh()
      const user = userActor(actor)
      const order = orderById(orderId)
      if (order.userId !== user.id) throw new Error('无权支付该订单')
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
      refresh()
      const order = orderById(orderId)
      if (order.merchantId !== merchantId(actor)) throw new Error('无权操作该订单')
      order.status = transitionOrder(order.status, 'SHIP')
      order.timeline.push(orderEvent(order.status, '商家已发货'))
      persist()
      return clone(order)
    },
    async receiveOrder(actor, orderId) {
      refresh()
      const order = orderById(orderId)
      const user = authenticatedActor(actor)
      if (user.role !== 'USER' || user.id !== order.userId) throw new RepositoryError('ORDER_FORBIDDEN', '无权操作该订单')
      if (order.status !== 'SHIPPED') throw new RepositoryError('ORDER_RECEIVE_INVALID_STATUS', '当前订单状态不能确认收货')
      order.status = transitionOrder(order.status, 'RECEIVE')
      order.timeline.push(orderEvent(order.status, '用户已收货'))
      persist()
      return clone(order)
    },
    async listAfterSales(actor) {
      refresh()
      authenticatedActor(actor)
      const afterSales = actor.role === 'ADMIN' ? data.afterSales : actor.role === 'MERCHANT' ? data.afterSales.filter((afterSale) => afterSale.merchantId === merchantId(actor)) : data.afterSales.filter((afterSale) => afterSale.userId === actor.userId)
      return clone(afterSales)
    },
    async requestAfterSale(actor, orderId, reason) {
      refresh()
      const order = orderById(orderId)
      const user = authenticatedActor(actor)
      if (user.role !== 'USER' || user.id !== order.userId) throw new RepositoryError('AFTER_SALE_FORBIDDEN', '无权申请该订单售后')
      const normalizedReason = reason.trim()
      if (!normalizedReason) throw new RepositoryError('AFTER_SALE_REASON_REQUIRED', '请填写售后原因')
      if (!(['PAID', 'SHIPPED', 'RECEIVED'] as const).includes(order.status as 'PAID' | 'SHIPPED' | 'RECEIVED')) {
        throw new RepositoryError('AFTER_SALE_INVALID_STATUS', '当前订单状态不能申请售后')
      }
      const activeStatuses = new Set<AfterSale['status']>(['REQUESTED', 'PROCESSING', 'APPROVED'])
      if (data.afterSales.some((afterSale) => afterSale.orderId === orderId && activeStatuses.has(afterSale.status))) {
        throw new RepositoryError('AFTER_SALE_DUPLICATE', '订单已有进行中的售后申请')
      }
      order.timeline.push(orderEvent('AFTER_SALE_REQUESTED', '已申请售后', normalizedReason))
      const afterSale: AfterSale = {
        id: createBusinessId('AFTER_SALE'),
        orderId,
        userId: order.userId,
        merchantId: order.merchantId,
        reason: normalizedReason,
        status: 'REQUESTED',
        timeline: [orderEvent('REQUESTED', '售后申请已提交', normalizedReason)],
      }
      data.afterSales.push(afterSale)
      persist()
      return clone(afterSale)
    },
    async resolveAfterSale(actor, afterSaleId, decision, note) {
      refresh()
      const afterSale = afterSaleById(afterSaleId)
      let ownerId: string
      try { ownerId = merchantId(actor) } catch { throw new RepositoryError('AFTER_SALE_FORBIDDEN', '无权处理该售后') }
      if (afterSale.merchantId !== ownerId) throw new RepositoryError('AFTER_SALE_FORBIDDEN', '无权处理该售后')
      if (afterSale.status !== 'REQUESTED') throw new RepositoryError('AFTER_SALE_INVALID_STATUS', '当前售后状态不能处理')
      const normalizedNote = note.trim()
      afterSale.status = transitionAfterSale(afterSale.status, 'PROCESS')
      afterSale.timeline.push(orderEvent(afterSale.status, '商家开始处理', normalizedNote))
      afterSale.status = transitionAfterSale(afterSale.status, decision)
      afterSale.resolutionNote = normalizedNote
      afterSale.timeline.push(orderEvent(afterSale.status, decision === 'APPROVE' ? '售后已通过' : '售后已拒绝', normalizedNote))
      persist()
      return clone(afterSale)
    },
    async refundAfterSale(actor, afterSaleId, note) {
      refresh()
      const afterSale = afterSaleById(afterSaleId)
      let ownerId: string
      try { ownerId = merchantId(actor) } catch { throw new RepositoryError('AFTER_SALE_FORBIDDEN', '无权执行模拟退款') }
      if (afterSale.merchantId !== ownerId) throw new RepositoryError('AFTER_SALE_FORBIDDEN', '无权执行模拟退款')
      if (afterSale.status !== 'APPROVED') throw new RepositoryError('AFTER_SALE_INVALID_STATUS', '当前售后状态不能退款')
      afterSale.status = transitionAfterSale(afterSale.status, 'REFUND')
      afterSale.timeline.push(orderEvent(afterSale.status, '模拟退款完成', note.trim()))
      persist()
      return clone(afterSale)
    },
    async listBookings(actor) {
      refresh()
      const user = authenticatedActor(actor)
      if (user.role === 'MERCHANT') throw new RepositoryError('BOOKING_FORBIDDEN', '商家无权查看预约记录')
      const bookings = user.role === 'ADMIN'
        ? data.bookings
        : data.bookings.filter((booking) => booking.userId === user.id)
      return clone(bookings)
    },
    async createBooking(actor, input: BookingInput) {
      refresh()
      const user = bookingUser(actor)
      if (!isStrictCalendarDate(input.date) || input.date <= localDate(clock())) {
        throw new RepositoryError('BOOKING_INVALID_DATE', '请选择未来日期')
      }
      if (!Number.isSafeInteger(input.people) || input.people < 1 || input.people > 12) {
        throw new RepositoryError('BOOKING_INVALID_PEOPLE', '预约人数应为1至12人')
      }
      const phone = input.phone.trim()
      if (!isValidPhone(phone)) throw new RepositoryError('BOOKING_INVALID_PHONE', '请输入11位中国大陆手机号')
      let posterId: string | undefined
      if (input.posterId !== undefined) {
        const posterKey = normalizePosterKey(input.posterId.trim())
        const poster = (readJourneyPosterStorage(storage).postersByUser[user.id] ?? [])
          .find(({ id }) => normalizePosterKey(id) === posterKey)
        if (poster === undefined) throw new RepositoryError('BOOKING_POSTER_INVALID', '配方海报不存在或不属于当前用户')
        posterId = poster.id
      }
      const booking: Booking = {
        id: createBusinessId('BOOKING'),
        userId: user.id,
        date: input.date,
        people: input.people,
        phone,
        ...(posterId === undefined ? {} : { posterId }),
        code: createBusinessId('BOOK').toUpperCase(),
        status: 'PENDING',
        timeline: [orderEvent('PENDING', '预约已提交')],
        createdAt: now(),
      }
      data.bookings.push(booking)
      persist()
      return clone(booking)
    },
    async cancelBooking(actor, bookingId) {
      refresh()
      const user = bookingUser(actor)
      const booking = bookingById(bookingId)
      if (booking.userId !== user.id) throw new RepositoryError('BOOKING_FORBIDDEN', '无权取消该预约')
      if (booking.status === 'CANCELLED') return clone(booking)
      if (booking.status !== 'PENDING') throw new RepositoryError('BOOKING_CANCEL_INVALID_STATUS', '当前预约状态不能取消')
      booking.status = transitionBooking(booking.status, 'CANCEL')
      booking.timeline.push(orderEvent(booking.status, '预约已取消'))
      persist()
      return clone(booking)
    },
    async verifyBooking(actor, code) {
      refresh()
      const admin = bookingAdmin(actor)
      const normalizedCode = normalizePosterKey(code.trim())
      const booking = data.bookings.find((candidate) => normalizePosterKey(candidate.code) === normalizedCode)
      if (booking === undefined) throw new RepositoryError('BOOKING_CODE_INVALID', '预约核销码不存在')
      if (booking.status === 'VERIFIED') throw new RepositoryError('BOOKING_CODE_USED', '预约核销码已使用')
      if (booking.status === 'CANCELLED') throw new RepositoryError('BOOKING_CANCELLED', '预约已取消')
      booking.status = transitionBooking(booking.status, 'VERIFY')
      booking.verifiedAt = now()
      booking.verifiedBy = admin.id
      booking.timeline.push(orderEvent(booking.status, '预约已核销'))
      persist()
      return clone(booking)
    },
    async getMerchantApplication(userId) { refresh(); return clone([...data.merchantApplications].reverse().find((application) => application.userId === userId) ?? null) },
    async applyMerchant(actor, input: MerchantApplicationInput) {
      refresh()
      const user = actorRole(actor, 'USER')
      if (user.merchantStatus === 'PENDING' || data.merchantApplications.some((application) => application.userId === user.id && application.status === 'PENDING')) throw new Error('已有待审核申请')
      if (user.merchantStatus === 'APPROVED') throw new Error('已是商家')
      if (input.agreementAccepted !== true) throw new Error('请阅读并同意商家入驻协议')
      if (!input.shopName.trim() || !input.contact.trim() || !input.location.trim() || !input.introduction.trim()) throw new Error('申请信息无效')
      const createdAt = now()
      const application: MerchantApplication = {
        id: createBusinessId('MERCHANT_APPLICATION'),
        userId: user.id,
        shopName: input.shopName.trim(),
        contact: input.contact.trim(),
        location: input.location.trim(),
        introduction: input.introduction.trim(),
        status: 'PENDING',
        agreementAcceptedAt: createdAt,
        createdAt,
      }
      user.merchantStatus = 'PENDING'
      data.merchantApplications.push(application)
      persist()
      return clone(application)
    },
    async listMerchantProducts(actor) {
      refresh()
      const owner = merchantId(actor)
      return data.products.filter((product) => product.merchantId === owner).map(productForRead)
    },
    async listMerchantApplications(actor) { refresh(); actorRole(actor, 'ADMIN'); return clone(data.merchantApplications) },
    async listAdminProducts(actor) { refresh(); actorRole(actor, 'ADMIN'); return data.products.map(productForRead) },
    async listAdminContents(actor) { refresh(); actorRole(actor, 'ADMIN'); return clone(data.contents) },
    async reviewMerchant(actor, applicationId, decision) {
      refresh()
      actorRole(actor, 'ADMIN')
      const application = data.merchantApplications.find((candidate) => candidate.id === applicationId)
      if (application === undefined || application.status !== 'PENDING') throw new Error('商家申请不可审核')
      const reason = decision.reason?.trim()
      if (decision.result === 'REJECT' && !reason) throw new Error('请填写驳回理由')
      application.status = decision.result === 'APPROVE' ? 'APPROVED' : 'REJECTED'
      application.reviewReason = reason
      const user = userById(application.userId)
      user.merchantStatus = application.status
      if (decision.result === 'APPROVE') { user.role = 'MERCHANT'; user.merchantId = createBusinessId('MERCHANT') }
      persist()
      return clone(application)
    },
    async saveProduct(actor, input: ProductDraftInput) {
      refresh()
      const owner = merchantId(actor)
      const ownerName = userById(actor.userId).displayName
      if (!input.name.trim() || !input.category.trim() || !input.description.trim() || !input.image.trim()) throw new Error('商品信息无效')
      if (!Number.isSafeInteger(input.priceCents) || input.priceCents <= 0) throw new Error('商品价格必须大于 0')
      if (!Number.isSafeInteger(input.stock) || input.stock < 0) throw new Error('商品库存无效')
      const existing = input.id === undefined ? undefined : productById(input.id)
      if (existing !== undefined && existing.merchantId !== owner) throw new Error('无权编辑该商品')
      if (existing !== undefined && !['DRAFT', 'REJECTED'].includes(existing.status)) throw new Error('当前商品状态不可编辑')
      const product: Product = existing ?? {
        id: createBusinessId('PRODUCT'),
        merchantId: owner,
        merchantName: ownerName,
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
      Object.assign(product, clone({ merchantName: ownerName, name: input.name, category: input.category, priceCents: input.priceCents, stock: input.stock, description: input.description, image: input.image }))
      if (existing === undefined) data.products.push(product)
      persist()
      return clone(product)
    },
    async submitProduct(actor, productId) {
      refresh()
      const product = productById(productId)
      if (product.merchantId !== merchantId(actor)) throw new Error('无权提交该商品')
      product.status = transitionProduct(product.status, 'SUBMIT')
      persist()
      return clone(product)
    },
    async reviewProduct(actor, productId, decision) {
      refresh()
      actorRole(actor, 'ADMIN')
      const product = productById(productId)
      const reason = decision.reason?.trim()
      if (decision.result === 'REJECT' && !reason) throw new Error('请填写驳回理由')
      product.status = transitionProduct(product.status, decision.result)
      product.reviewReason = reason
      persist()
      return clone(product)
    },
    async saveContent(actor, input: ContentInput) {
      refresh()
      actorRole(actor, 'ADMIN')
      const normalized = {
        title: input.title.trim(),
        slug: input.slug.trim(),
        category: input.category.trim(),
        summary: input.summary.trim(),
        body: input.body.trim(),
        cover: input.cover.trim(),
        sources: input.sources.map((source) => ({
          title: source.title.trim(),
          publisher: source.publisher.trim(),
          url: source.url.trim(),
          claim: source.claim.trim(),
        })),
        published: input.published,
      }
      const hasInvalidSource = normalized.sources.length === 0 || normalized.sources.some((source) => (
        !source.title || !source.publisher || !source.claim || !isValidSourceUrl(source.url)
      ))
      if (!normalized.title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.slug) || !normalized.category || !normalized.summary || !normalized.body || !normalized.cover || hasInvalidSource) throw new Error('内容信息无效')
      if (data.contents.some((content) => content.slug === normalized.slug && content.id !== input.id)) throw new Error('内容路径已存在')
      const existing = input.id === undefined ? undefined : data.contents.find((content) => content.id === input.id)
      if (input.id !== undefined && existing === undefined) throw new Error('内容不存在')
      const content: ContentArticle = existing ?? { id: createBusinessId('CONTENT'), cover: '' } as ContentArticle
      Object.assign(content, clone(normalized))
      if (existing === undefined) data.contents.push(content)
      persist()
      return clone(content)
    },
    async dashboard(actor): Promise<DashboardMetrics> {
      refresh()
      actorRole(actor, 'ADMIN')
      return clone({ revenueCents: data.orders.filter((order) => order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELLED').reduce((total, order) => total + order.totalCents, 0), orderCount: data.orders.length, productCount: data.products.length, bookingCount: data.bookings.length, afterSaleCount: data.afterSales.length })
    },
    async reset() { refresh(); data = createSeedData(); persist() },
  }
}
