import type { Actor, MerchantApplicationInput, OrderContact } from '../../domain/types'
import type { PlatformRepository } from '../../data/repository'
import { createDemoRepository } from '../../data/demoRepository'

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
}

const actorFor = (user: { id: string; role: Actor['role']; merchantId?: string }): Actor => ({
  userId: user.id,
  role: user.role,
  ...(user.merchantId === undefined ? {} : { merchantId: user.merchantId }),
})

async function createApprovedSecondMerchantProduct(repo: PlatformRepository) {
  const applicant = await repo.register({ username: 'other-merchant', password: 'Demo123!', phone: '13800138003' })
  const application = await repo.applyMerchant(actorFor(applicant.user), {
    shopName: '另一家酸茶工坊', contact: '13800138003', location: '云南省德宏州', introduction: '用于商家归属测试。',
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
  it('validates a session only when its user id and session id match', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const session = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })

    await expect(repo.validateSession(session.user.id, session.sessionId)).resolves.toEqual(session)
    await expect(repo.validateSession('admin-demo', session.sessionId)).rejects.toThrow('会话无效')
    await expect(repo.validateSession(session.user.id, 'SESSION-forged')).rejects.toThrow('会话无效')
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
    const order = await repo.createOrder(user.user.id, [{ productId: 'product-tasting', quantity: 2 }], contact)

    expect(order.status).toBe('PENDING_PAYMENT')
    expect((await repo.payOrder(order.id, 'SUCCESS')).status).toBe('PAID')
  })

  it('rejects a duplicate username and invalid registration phone', async () => {
    const repo = createDemoRepository(new MemoryStorage())

    await expect(repo.register({ username: 'user_demo', password: 'Demo123!', phone: '13800138000' })).rejects.toThrow()
    await expect(repo.register({ username: 'other-user', password: 'Demo123!', phone: '10000000000' })).rejects.toThrow()
  })

  it('rejects orders whose requested quantity exceeds available stock', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })

    await expect(repo.createOrder(user.user.id, [{ productId: 'product-tasting', quantity: 81 }], contact)).rejects.toThrow()
  })

  it('only decrements stock on the first successful payment and makes repeated payment idempotent', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const before = await repo.getProduct('product-tasting')
    const order = await repo.createOrder(user.user.id, [{ productId: before.id, quantity: 2 }], contact)

    const paid = await repo.payOrder(order.id, 'SUCCESS')
    const afterFirstPayment = await repo.getProduct(before.id)
    const paidAgain = await repo.payOrder(order.id, 'SUCCESS')
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
    const order = await repo.createOrder(user.user.id, [{ productId: product.id, quantity: 1 }], contact)

    expect((await repo.payOrder(order.id, 'SUCCESS')).status).toBe('PAID')
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
    const order = await repo.createOrder(user.user.id, [{ productId: 'product-tasting', quantity: 1 }], contact)
    await repo.payOrder(order.id, 'SUCCESS')

    await expect(repo.getOrder(actorFor(merchant.user), order.id)).resolves.toMatchObject({ id: order.id, merchantId: merchant.user.merchantId })
  })

  it('rejects forged roles before they can receive orders', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const forgedUserActor = { userId: merchant.user.id, role: 'USER' } as const
    const shippedOrder = await repo.createOrder(merchant.user.id, [{ productId: 'product-tasting', quantity: 1 }], contact)

    await repo.payOrder(shippedOrder.id, 'SUCCESS')
    expect((await repo.shipOrder(merchantActor, shippedOrder.id)).status).toBe('SHIPPED')
    await expect(repo.receiveOrder(forgedUserActor, shippedOrder.id)).rejects.toThrow('角色身份无效')
    expect((await repo.getOrder(merchantActor, shippedOrder.id)).status).toBe('SHIPPED')
  })

  it('rejects forged roles before they can request after-sales', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const merchant = await repo.login({ username: 'merchant_demo', password: 'Demo123!' })
    const merchantActor = { userId: merchant.user.id, role: merchant.user.role, merchantId: merchant.user.merchantId } as const
    const forgedUserActor = { userId: merchant.user.id, role: 'USER' } as const
    const paidOrder = await repo.createOrder(merchant.user.id, [{ productId: 'product-gift', quantity: 1 }], contact)

    expect((await repo.payOrder(paidOrder.id, 'SUCCESS')).status).toBe('PAID')
    await expect(repo.requestAfterSale(forgedUserActor, paidOrder.id, '伪造角色申请')).rejects.toThrow('角色身份无效')
    expect((await repo.getOrder(merchantActor, paidOrder.id)).status).toBe('PAID')
  })

  it('allows the legitimate user to request after-sale for a valid own order', async () => {
    const repo = createDemoRepository(new MemoryStorage())
    const user = await repo.login({ username: 'user_demo', password: 'Demo123!' })
    const order = await repo.createOrder(user.user.id, [{ productId: 'product-gift', quantity: 1 }], contact)
    await repo.payOrder(order.id, 'SUCCESS')

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
    await repo.saveCart(user.user.id, [{ productId: 'product-tasting', quantity: 1, unitPriceCents: 5900 }])
    expect(JSON.parse(storage.getItem('deang-sour-tea:v3') ?? '{}').version).toBe(3)

    await repo.reset()
    expect(await repo.getCart(user.user.id)).toEqual([])
    expect(JSON.parse(storage.getItem('deang-sour-tea:v3') ?? '{}').version).toBe(3)
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
    expect((await repo.getProduct('product-pending')).status).toBe('PENDING')
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
