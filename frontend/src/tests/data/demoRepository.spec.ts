import type { Actor, Booking, ContentArticle, MerchantApplicationInput, OrderContact } from '../../domain/types'
import type { PlatformRepository } from '../../data/repository'
import { createDemoRepository } from '../../data/demoRepository'
import { createSeedData, DEMO_DATA_VERSION, DEMO_STORAGE_KEY, LEGACY_DEMO_STORAGE_KEY, type DemoData } from '../../data/seed'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void { this.values.clear() }
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null }
  removeItem(key: string): void { this.values.delete(key) }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const contact: OrderContact = {
  recipient: '测试用户',
  phone: '13800138000',
  address: '云南省德宏州芒市测试路 1 号',
}

const merchantApplicationInput: MerchantApplicationInput = {
  shopName: '酸茶新工坊',
  contact: '13800138003',
  location: '云南省德宏州',
  introduction: '用于商家申请授权测试。',
  agreementAccepted: true,
}

const actorFor = (user: { id: string; role: Actor['role']; merchantId?: string }): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

const v3BuiltInContents: ContentArticle[] = [
  {
    id: 'content-about',
    slug: 'what-is-sour-tea',
    title: '德昂族酸茶是什么',
    category: '酸茶科普',
    summary: '介绍酸茶的来源与风味。',
    body: '德昂族酸茶是围绕古法制茶经验形成的非遗体验核心内容。',
    cover: '/images/content-about.jpg',
    sources: [],
    published: true,
  },
  {
    id: 'content-craft',
    slug: 'fermentation-craft',
    title: '杀青、揉捻与45天发酵',
    category: '制作技艺',
    summary: '把手工经验拆解为三步。',
    body: '平台将杀青、揉捻和发酵拆解为互动与线下工坊体验。',
    cover: '/images/content-craft.jpg',
    sources: [],
    published: true,
  },
]

const createV3Data = (): DemoData => {
  const data = createSeedData()
  data.contents = structuredClone(v3BuiltInContents)
  return data
}

async function createApprovedSecondMerchantProduct(repo: PlatformRepository) {
  const applicant = await repo.register({ username: 'other-merchant', password: 'Demo123!', phone: '13800138003' })
  const application = await repo.applyMerchant(actorFor(applicant.user), {
    shopName: '另一家酸茶工坊', contact: '13800138003', location: '云南省德宏州', introduction: '用于商家归属测试。', agreementAccepted: true,
  })
  const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
  const adminActor = { userId: admin.user.id, role: admin.user.role } as const
  await repo.reviewMerchant(adminActor, application.id, { result: 'APPROVE', reason: '资料完整' })

  const merchant = await repo.login({ username: 'other-merchant', password: 'Demo123!' })
  const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
  const product = await repo.saveProduct(merchantActor, {
    name: '另一家工坊体验装', category: '体验装', priceCents: 6900, stock: 10, description: '用于订单归属测试。', image: 'other.jpg',
  })
  await repo.submitProduct(merchantActor, product.id)
  return { adminActor, merchant, product: await repo.reviewProduct(adminActor, product.id, { result: 'APPROVE', reason: '符合要求' }) }
}

describe('demo repository', () => {
  it('migrates terminal legacy bookings with a complete and honest timeline', () => {
    const storage = new MemoryStorage()
    const legacy = createSeedData()
    const createdAt = '2026-07-12T00:00:00.000Z'
    legacy.bookings = [
      {
        id: 'booking-legacy-cancelled', userId: 'user-demo', date: '2026-09-01', people: 2,
        phone: '13800138000', code: 'BOOK-LEGACY-CANCEL', status: 'CANCELLED', createdAt,
      },
      {
        id: 'booking-legacy-verified', userId: 'user-demo', date: '2026-09-02', people: 3,
        phone: '13800138000', code: 'BOOK-LEGACY-VERIFY', status: 'VERIFIED', createdAt,
      },
    ] as Booking[]
    storage.setItem(LEGACY_DEMO_STORAGE_KEY, JSON.stringify({ version: 4, data: legacy }))

    createDemoRepository(storage)
    const migrated = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as { data: DemoData }

    for (const booking of migrated.data.bookings) {
      expect(booking.timeline.map(({ status }) => status)).toEqual(['PENDING', booking.status])
      expect(booking.timeline[0]).toMatchObject({ status: 'PENDING', at: createdAt })
      expect(booking.timeline[1]).toMatchObject({
        status: booking.status,
        at: createdAt,
        timeKnown: false,
        note: '历史记录迁移：终态发生时间未知',
      })
    }
  })

  it('migrates the real v3 key to v5 without losing user business data', async () => {
    const storage = new MemoryStorage()
    const legacy = createV3Data()
    const customUser = {
      id: 'user-custom',
      username: 'custom_user',
      displayName: '自定义用户',
      phone: '13800138999',
      role: 'USER' as const,
      merchantStatus: 'PENDING' as const,
    }
    const customProduct = {
      id: 'product-custom',
      merchantId: 'merchant-demo-shop',
      name: '用户自建商品',
      category: '自定义',
      priceCents: 8800,
      stock: 7,
      sales: 3,
      description: '迁移时必须完整保留。',
      image: '/images/product-tasting.jpg',
      status: 'DRAFT' as const,
    }
    const customContent = {
      id: 'content-custom',
      slug: 'user-created-story',
      title: '用户自建内容',
      category: '工坊记录',
      summary: '不得被内置内容覆盖。',
      body: '用户保存的正文。',
      cover: '/uploads/custom-cover.jpg',
      sources: [],
      published: true,
    }
    const customOrder = {
      id: 'order-custom',
      orderNo: 'DST-CUSTOM-001',
      userId: customUser.id,
      merchantId: 'merchant-demo-shop',
      lines: [{
        productId: customProduct.id,
        productName: customProduct.name,
        image: '/images/product-tasting.jpg',
        quantity: 1,
        unitPriceCents: customProduct.priceCents,
      }],
      totalCents: customProduct.priceCents,
      status: 'PAID' as const,
      contact: { recipient: '自定义用户', phone: customUser.phone, address: '云南省德宏州自定义地址' },
      timeline: [{ status: 'PAID', label: '已支付', at: '2026-07-12T00:00:00.000Z' }],
      createdAt: '2026-07-12T00:00:00.000Z',
    }
    const customBooking = {
      id: 'booking-custom',
      userId: customUser.id,
      date: '2026-09-01',
      people: 3,
      phone: customUser.phone,
      code: 'BOOK-CUSTOM-01',
      status: 'PENDING' as const,
      createdAt: '2026-07-12T00:00:00.000Z',
    }
    const customAfterSale = {
      id: 'after-sale-custom',
      orderId: customOrder.id,
      userId: customUser.id,
      merchantId: customOrder.merchantId,
      reason: '保留迁移状态',
      status: 'PROCESSING' as const,
      timeline: [{ status: 'PROCESSING', label: '处理中', at: '2026-07-12T00:00:00.000Z' }],
    }
    const customApplication = {
      id: 'merchant-application-custom',
      userId: customUser.id,
      shopName: '自定义工坊',
      contact: customUser.phone,
      location: '云南省德宏州',
      introduction: '保留申请状态。',
      status: 'PENDING' as const,
      createdAt: '2026-07-12T00:00:00.000Z',
    }

    legacy.users.push(customUser)
    legacy.passwords[customUser.id] = 'Custom123!'
    legacy.sessions['SESSION-custom'] = customUser.id
    legacy.carts[customUser.id] = [{ productId: customProduct.id, quantity: 2, unitPriceCents: customProduct.priceCents }]
    legacy.products[0] = { ...legacy.products[0], image: '/images/product-tasting.jpg', stock: 11, status: 'OFF_SHELF' }
    legacy.products[1] = { ...legacy.products[1], image: '/images/product-gift.jpg', stock: 13 }
    legacy.products.push(customProduct)
    legacy.contents.push(customContent)
    legacy.orders[0].lines[0].image = '/images/product-tasting.jpg'
    legacy.orders[1].lines[0].image = '/images/product-gift.jpg'
    legacy.orders.push(customOrder)
    legacy.afterSales.push(customAfterSale)
    legacy.bookings.push(customBooking as unknown as Booking)
    legacy.merchantApplications.push(customApplication)
    const serializedV3 = JSON.stringify({ version: 3, data: legacy })
    storage.setItem('deang-sour-tea:v3', serializedV3)

    const repo = createDemoRepository(storage)
    const migrated = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as { version: number; data: typeof legacy }
    const adminUser = legacy.users.find(({ role }) => role === 'ADMIN')!
    const migratedProducts = await repo.listAdminProducts(actorFor(adminUser))

    await expect(repo.validateSession(customUser.id, 'SESSION-custom')).resolves.toMatchObject({ user: customUser })
    await expect(repo.getCart(actorFor(customUser))).resolves.toEqual(legacy.carts[customUser.id])
    await expect(repo.listOrders(actorFor(customUser))).resolves.toContainEqual(customOrder)
    await expect(repo.listBookings(actorFor(customUser))).resolves.toContainEqual(expect.objectContaining({
      ...customBooking,
      timeline: expect.any(Array),
    }))
    expect(migratedProducts.find(({ id }) => id === customProduct.id)).toMatchObject({
      ...customProduct,
      merchantName: '酸茶工坊',
    })
    expect(await repo.listContents()).toContainEqual(customContent)
    expect((await repo.getContent('what-is-sour-tea')).sources.length).toBeGreaterThan(0)
    expect((await repo.getContent('fermentation-craft')).title).not.toContain('45天')
    expect(migratedProducts.find(({ id }) => id === 'product-tasting')).toMatchObject({ image: '/images/product-tasting.webp', stock: 11, status: 'OFF_SHELF' })
    expect(await repo.getProduct('product-gift')).toMatchObject({ image: '/images/product-gift.webp', stock: 13 })
    expect(migrated).toMatchObject({ version: 5 })
    expect(migrated.data.users).toEqual(legacy.users)
    expect(migrated.data.passwords).toEqual(legacy.passwords)
    expect(migrated.data.sessions).toEqual(legacy.sessions)
    expect(migrated.data.afterSales).toContainEqual(customAfterSale)
    expect(migrated.data.merchantApplications).toContainEqual(customApplication)
    expect(migrated.data.orders[0].lines[0].image).toBe('/images/product-tasting.webp')
    expect(migrated.data.orders[1].lines[0].image).toBe('/images/product-gift.webp')
    expect(migrated.data.orders.find(({ id }) => id === customOrder.id)).toEqual(customOrder)
    expect(storage.getItem('deang-sour-tea:v3')).toBe(serializedV3)
  })

  it('upgrades only unchanged v3 content fields and preserves user edits and extensions', () => {
    const storage = new MemoryStorage()
    const legacy = createV3Data()
    const editedAbout = Object.assign(legacy.contents[0], {
      title: '用户修改的酸茶标题',
      body: '用户修改的酸茶正文。',
      published: false,
      customField: '用户扩展字段',
    })
    storage.setItem('deang-sour-tea:v3', JSON.stringify({ version: 3, data: legacy }))

    createDemoRepository(storage)

    const persisted = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as {
      version: number
      data: DemoData & { contents: Array<ContentArticle & { customField?: string }> }
    }
    const migratedAbout = persisted.data.contents.find(({ id }) => id === editedAbout.id)
    const currentAbout = createSeedData().contents.find(({ id }) => id === editedAbout.id)

    expect(migratedAbout).toMatchObject({
      title: editedAbout.title,
      body: editedAbout.body,
      published: editedAbout.published,
      customField: editedAbout.customField,
      cover: currentAbout?.cover,
      sources: currentAbout?.sources,
      summary: currentAbout?.summary,
    })
  })

  it.each([
    ['null sessions', (data: Record<string, unknown>) => { data.sessions = null }],
    ['missing bookings', (data: Record<string, unknown>) => { delete data.bookings }],
    ['wrong products collection', (data: Record<string, unknown>) => { data.products = {} }],
    ['non-array cart value', (data: Record<string, unknown>) => { data.carts = { 'user-demo': {} } }],
    ['broken order lines', (data: Record<string, unknown>) => {
      const orders = data.orders as Array<Record<string, unknown>>
      orders[0].lines = {}
    }],
  ])('rejects invalid v3 data with %s and writes a fresh v5 seed', (_caseName, corrupt) => {
    const storage = new MemoryStorage()
    const legacy = createV3Data() as unknown as Record<string, unknown>
    corrupt(legacy)
    storage.setItem('deang-sour-tea:v3', JSON.stringify({ version: 3, data: legacy }))

    expect(() => createDemoRepository(storage)).not.toThrow()

    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}')).toEqual({
      version: DEMO_DATA_VERSION,
      data: createSeedData(),
    })
  })

  it('deduplicates built-in content ids deterministically and migrates the first entry', () => {
    const storage = new MemoryStorage()
    const legacy = createV3Data()
    legacy.contents[1] = { ...legacy.contents[1], title: '用户保留的第一条工艺标题' }
    legacy.contents.push(
      { ...v3BuiltInContents[0], title: '不应保留的第二条科普' },
      { ...v3BuiltInContents[1], title: '不应保留的第二条工艺' },
    )
    storage.setItem('deang-sour-tea:v3', JSON.stringify({ version: 3, data: legacy }))

    createDemoRepository(storage)

    const persisted = JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}') as { data: DemoData }
    const aboutEntries = persisted.data.contents.filter(({ id }) => id === 'content-about')
    const craftEntries = persisted.data.contents.filter(({ id }) => id === 'content-craft')
    expect(aboutEntries).toHaveLength(1)
    expect(craftEntries).toHaveLength(1)
    expect(aboutEntries[0].title).toBe(createSeedData().contents[0].title)
    expect(craftEntries[0].title).toBe('用户保留的第一条工艺标题')
  })

  it('adds a missing built-in culture article once and leaves an existing v5 migration unchanged', async () => {
    const storage = new MemoryStorage()
    const legacy = createV3Data()
    legacy.contents = legacy.contents.filter(({ id }) => id !== 'content-craft')
    legacy.contents.push({
      id: 'content-migration-sentinel',
      slug: 'migration-sentinel',
      title: '迁移保留内容',
      category: '用户内容',
      summary: '用于证明补齐不等于重建。',
      body: '必须原样保留。',
      cover: '/uploads/sentinel.jpg',
      sources: [],
      published: true,
    })
    storage.setItem('deang-sour-tea:v3', JSON.stringify({ version: 3, data: legacy }))

    const firstRepo = createDemoRepository(storage)
    await expect(firstRepo.getContent('fermentation-craft')).resolves.toMatchObject({ id: 'content-craft' })
    await expect(firstRepo.getContent('migration-sentinel')).resolves.toMatchObject({ id: 'content-migration-sentinel' })
    const migratedOnce = storage.getItem(DEMO_STORAGE_KEY)

    const secondRepo = createDemoRepository(storage)
    await expect(secondRepo.getContent('fermentation-craft')).resolves.toMatchObject({ id: 'content-craft' })
    expect(storage.getItem(DEMO_STORAGE_KEY)).toBe(migratedOnce)
  })

  it('validates a session only when its user id and session id match', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const session = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })

    await expect(repo.validateSession(session.user.id, session.sessionId)).resolves.toEqual(session)
    await expect(repo.validateSession('admin-demo', session.sessionId)).rejects.toThrow('会话无效')
    await expect(repo.validateSession(session.user.id, 'SESSION-forged')).rejects.toThrow('会话无效')
  })

  it('reports missing content with a stable repository error code', async () => {
    const repo = createDemoRepository(new MemoryStorage())

    await expect(repo.getContent('missing-content')).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' })
  })

  it('invalidates a session on logout', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const session = await repo.login({ username: 'user_demo', password: 'Demo123!' })

    await repo.logout(session.sessionId)

    await expect(repo.validateSession(session.user.id, session.sessionId)).rejects.toThrow('会话无效')
  })

  it('registers a user and completes the payment lifecycle', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.register({ username: 'new-user', password: 'Demo123!', phone: '13800138000' })
    const actor = actorFor(user.user)
    const order = await repo.createOrder(actor, [{ productId: 'product-tasting', quantity: 2 }], contact, 'checkout-payment-lifecycle')

    expect(order.status).toBe('PENDING_PAYMENT')
    expect((await repo.payOrder(actor, order.id, 'SUCCESS')).status).toBe('PAID')
  })

  it('rejects a duplicate username and invalid registration phone', async () => {
    const repo = createDemoRepository(new MemoryStorage())

    await expect(repo.register({ username: 'user_demo', password: 'Demo123!', phone: '13800138000' })).rejects.toThrow()
    await expect(repo.register({ username: 'other-user', password: 'Demo123!', phone: '10000000000' })).rejects.toThrow()
  })

  it('rejects orders whose requested quantity exceeds available stock', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })

    await expect(repo.createOrder(actorFor(user.user), [{ productId: 'product-tasting', quantity: 81 }], contact, 'checkout-insufficient-stock')).rejects.toThrow()
  })

  it('only decrements stock on the first successful payment and makes repeated payment idempotent', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const before = await repo.getProduct('product-tasting')
    const actor = actorFor(user.user)
    const order = await repo.createOrder(actor, [{ productId: before.id, quantity: 2 }], contact, 'checkout-repeat-success')

    const paid = await repo.payOrder(actor, order.id, 'SUCCESS')
    const afterFirstPayment = await repo.getProduct(before.id)
    const paidAgain = await repo.payOrder(actor, order.id, 'SUCCESS')
    const afterRepeatedPayment = await repo.getProduct(before.id)

    expect(paid.status).toBe('PAID')
    expect(paidAgain).toEqual(paid)
    expect(afterFirstPayment.stock).toBe(before.stock - 2)
    expect(afterRepeatedPayment.stock).toBe(afterFirstPayment.stock)
  })

  it('enforces product permissions for persisted roles', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })

    await expect(repo.saveProduct({ userId: user.user.id, role: 'USER' }, {
      name: '越权商品', category: '体验装', priceCents: 5900, stock: 1, description: 'x', image: 'x',
    })).rejects.toThrow()
    await expect(repo.reviewProduct({ userId: merchant.user.id, role: 'MERCHANT', merchantId: merchant.user.merchantId }, 'product-pending', { result: 'APPROVE' })).rejects.toThrow()
  })

  it('uses an authenticated user actor as the merchant applicant', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const applicant = await repo.register({ username: 'self-applicant', password: 'Demo123!', phone: '13800138004' })

    const application = await repo.applyMerchant(actorFor(applicant.user), merchantApplicationInput)

    expect(application.userId).toBe(applicant.user.id)
    expect(application.status).toBe('PENDING')
    expectTypeOf<Parameters<PlatformRepository['applyMerchant']>>().toEqualTypeOf<[
      actor: Actor,
      input: MerchantApplicationInput,
    ]>()
  })

  it('does not let an actor submit a merchant application for another user', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const applicant = await repo.register({ username: 'actor-applicant', password: 'Demo123!', phone: '13800138005' })
    const otherUser = await repo.register({ username: 'target-user', password: 'Demo123!', phone: '13800138006' })

    const application = await repo.applyMerchant(actorFor(applicant.user), merchantApplicationInput)

    expect(application.userId).toBe(applicant.user.id)
    expect(await repo.getMerchantApplication(otherUser.user.id)).toBeNull()
  })

  it('rejects duplicate merchant applications from pending and approved users', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const applicant = await repo.register({ username: 'duplicate-applicant', password: 'Demo123!', phone: '13800138007' })
    const userActor = actorFor(applicant.user)
    const application = await repo.applyMerchant(userActor, merchantApplicationInput)

    await expect(repo.applyMerchant(userActor, merchantApplicationInput)).rejects.toThrow('已有待审核申请')

    const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
    await repo.reviewMerchant(actorFor(admin.user), application.id, { result: 'APPROVE', reason: '资料完整' })
    const approvedApplicant = await repo.login({ username: 'duplicate-applicant', password: 'Demo123!' })

    await expect(repo.applyMerchant(actorFor(approvedApplicant.user), merchantApplicationInput)).rejects.toThrow()
  })

  it('allows a rejected ordinary user to correct details and resubmit', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const applicant = await repo.register({ username: 'resubmitting-applicant', password: 'Demo123!', phone: '13800138008' })
    const userActor = actorFor(applicant.user)
    const firstApplication = await repo.applyMerchant(userActor, merchantApplicationInput)
    const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
    await repo.reviewMerchant(actorFor(admin.user), firstApplication.id, { result: 'REJECT', reason: '请补充门店信息' })

    const resubmission = await repo.applyMerchant(userActor, { ...merchantApplicationInput, shopName: '酸茶新工坊（已补充门店信息）' })

    expect(resubmission).toMatchObject({ userId: applicant.user.id, shopName: '酸茶新工坊（已补充门店信息）', status: 'PENDING' })
    expect(resubmission.id).not.toBe(firstApplication.id)
  })

  it('derives merchant order access from the persisted merchant identity', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const { merchant: otherMerchant, product } = await createApprovedSecondMerchantProduct(repo)
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const originalMerchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const userActor = actorFor(user.user)
    const order = await repo.createOrder(userActor, [{ productId: product.id, quantity: 1 }], contact, 'checkout-merchant-access')

    expect((await repo.payOrder(userActor, order.id, 'SUCCESS')).status).toBe('PAID')
    await expect(repo.getOrder({
      userId: originalMerchant.user.id,
      role: 'MERCHANT',
      merchantId: otherMerchant.user.merchantId,
    }, order.id)).rejects.toThrow()
  })

  it('allows the persisted merchant to read a valid own order', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const userActor = actorFor(user.user)
    const order = await repo.createOrder(userActor, [{ productId: 'product-tasting', quantity: 1 }], contact, 'checkout-own-order')
    await repo.payOrder(userActor, order.id, 'SUCCESS')

    await expect(repo.getOrder(actorFor(merchant.user), order.id)).resolves.toMatchObject({ id: order.id, merchantId: merchant.user.merchantId })
  })

  it('rejects forged roles before they can receive orders', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const forgedUserActor = { userId: merchant.user.id, role: 'USER' } as const
    const userActor = actorFor(user.user)
    const shippedOrder = await repo.createOrder(userActor, [{ productId: 'product-tasting', quantity: 1 }], contact, 'checkout-forged-receive')

    await repo.payOrder(userActor, shippedOrder.id, 'SUCCESS')
    expect((await repo.shipOrder(merchantActor, shippedOrder.id)).status).toBe('SHIPPED')
    await expect(repo.receiveOrder(forgedUserActor, shippedOrder.id)).rejects.toThrow('角色身份无效')
    expect((await repo.getOrder(merchantActor, shippedOrder.id)).status).toBe('SHIPPED')
  })

  it('rejects forged roles before they can request after-sales', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const forgedUserActor = { userId: merchant.user.id, role: 'USER' } as const
    const userActor = actorFor(user.user)
    const paidOrder = await repo.createOrder(userActor, [{ productId: 'product-gift', quantity: 1 }], contact, 'checkout-forged-after-sale')

    expect((await repo.payOrder(userActor, paidOrder.id, 'SUCCESS')).status).toBe('PAID')
    await expect(repo.requestAfterSale(forgedUserActor, paidOrder.id, '伪造角色申请')).rejects.toThrow('角色身份无效')
    expect((await repo.getOrder(merchantActor, paidOrder.id)).status).toBe('PAID')
  })

  it('allows the legitimate user to request after-sale for a valid own order', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const userActor = actorFor(user.user)
    const order = await repo.createOrder(userActor, [{ productId: 'product-gift', quantity: 1 }], contact, 'checkout-valid-after-sale')
    await repo.payOrder(userActor, order.id, 'SUCCESS')

    await expect(repo.requestAfterSale(actorFor(user.user), order.id, '礼盒运输破损')).resolves.toMatchObject({
      orderId: order.id,
      userId: user.user.id,
      status: 'REQUESTED',
    })
  })

  it('persists versioned data, returns clones, and reset restores the deterministic seed', async () => {
    const storage = new MemoryStorage()
    const repo = createDemoRepository(storage)
    const products = await repo.listProducts()
    products[0].name = '被外部修改'
    expect((await repo.getProduct(products[0].id)).name).not.toBe('被外部修改')

    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const userActor = actorFor(user.user)
    await repo.saveCart(userActor, [{ productId: 'product-tasting', quantity: 1 }])
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}').version).toBe(DEMO_DATA_VERSION)

    await repo.reset()
    expect(await repo.getCart(userActor)).toEqual([])
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? '{}').version).toBe(DEMO_DATA_VERSION)
  })

  it('seeds every later-task defense scenario with correct access and status', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const admin = await repo.login({ username: 'admin_demo', password: 'Demo123!' })
    const userActor = { userId: user.user.id, role: user.user.role } as const
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const adminActor = { userId: admin.user.id, role: admin.user.role } as const

    expect((await repo.listProducts()).filter((product) => product.status === 'APPROVED')).toHaveLength(2)
    await expect(repo.getProduct('product-pending')).rejects.toMatchObject({ code: 'PRODUCT_NOT_FOUND' })
    expect((await repo.listAdminProducts(adminActor)).find(({ id }) => id === 'product-pending')?.status).toBe('PENDING')
    expect(await repo.listContents()).toHaveLength(2)
    expect((await repo.listMerchantApplications(adminActor)).some((application) => application.status === 'PENDING')).toBe(true)
    expect((await repo.listBookings(userActor)).some((booking) => booking.status === 'PENDING')).toBe(true)
    expect((await repo.listOrders(userActor)).some((order) => order.status === 'SHIPPED')).toBe(true)
    expect((await repo.listAfterSales(merchantActor)).some((afterSale) => afterSale.status === 'REQUESTED')).toBe(true)

    const shipped = (await repo.listOrders(userActor)).find((order) => order.status === 'SHIPPED')
    expect(shipped).toBeDefined()
    await expect(repo.receiveOrder(merchantActor, shipped!.id)).rejects.toThrow()
    expect((await repo.receiveOrder(userActor, shipped!.id)).status).toBe('RECEIVED')
  })
})
