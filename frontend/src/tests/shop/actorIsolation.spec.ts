import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Actor, Order } from '../../domain/types'
import { commerceSeed, contact, createCommerceContext } from './context'

function seedWithSecondUser() {
  const data = commerceSeed()
  data.users.push({
    id: 'user-b',
    username: 'user_b',
    displayName: '账号 B',
    phone: '13800138009',
    role: 'USER',
    merchantStatus: 'NONE',
  })
  data.passwords['user-b'] = 'Demo123!'
  data.carts['user-demo'] = [{ productId: 'product-tasting', quantity: 1, unitPriceCents: 5900 }]
  data.carts['user-b'] = [{ productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 }]
  return data
}

function deferred<Value>() {
  let resolve!: (value: Value | PromiseLike<Value>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<Value>((done, fail) => {
    resolve = done
    reject = fail
  })
  return { promise, resolve, reject }
}

const userBActor: Actor = { userId: 'user-b', role: 'USER' }

describe('commerce actor isolation', () => {
  beforeEach(() => window.localStorage.clear())

  it('does not let an old checkout cleanup remove the new account merchant group', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()

    const enteredCleanup = deferred<void>()
    const releaseCleanup = deferred<void>()
    const originalRemoveMerchant = context.cart.removeMerchant.bind(context.cart) as (
      merchantId: string,
      expectedOwnerId?: string | null,
    ) => Promise<void>
    context.cart.removeMerchant = (async (merchantId: string, expectedOwnerId?: string | null) => {
      enteredCleanup.resolve(undefined)
      await releaseCleanup.promise
      return originalRemoveMerchant(merchantId, expectedOwnerId)
    }) as typeof context.cart.removeMerchant

    const checkout = context.orders.checkout('merchant-demo-shop', contact)
    await enteredCleanup.promise
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    await context.cart.load()
    expect(context.cart.items.map(({ quantity }) => quantity)).toEqual([2])

    releaseCleanup.resolve(undefined)
    await expect(checkout).rejects.toThrow('账号已切换')

    expect(context.cart.items.map(({ productId, quantity }) => ({ productId, quantity }))).toEqual([
      { productId: 'product-tasting', quantity: 2 },
    ])
    expect(await context.repository.getCart(userBActor)).toEqual([
      { productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 },
    ])
  })

  it('rechecks the fixed cart owner after the first merchant-cleanup await', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()
    const nextSession = await context.repository.login({ username: 'user_b', password: 'Demo123!' })

    queueMicrotask(() => context.auth.applySession(nextSession))
    await expect(context.cart.removeMerchant('merchant-demo-shop', 'user-demo')).rejects.toThrow('账号已切换')

    expect(await context.repository.getCart(userBActor)).toEqual([
      { productId: 'product-tasting', quantity: 2, unitPriceCents: 5900 },
    ])
  })

  it('keeps the new account checkout pending and error state when the old checkout rejects', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()

    const originalCreateOrder = context.repository.createOrder.bind(context.repository)
    const oldGate = deferred<void>()
    const newGate = deferred<void>()
    const createOrder = vi.spyOn(context.repository, 'createOrder').mockImplementation(async (actor, lines, orderContact, key) => {
      await (actor.userId === 'user-demo' ? oldGate.promise : newGate.promise)
      return originalCreateOrder(actor, lines, orderContact, key)
    })

    const oldCheckout = context.orders.checkout('merchant-demo-shop', contact)
    const oldResult = oldCheckout.catch((error: unknown) => error)
    await vi.waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    await context.cart.load()
    const newCheckout = context.orders.checkout('merchant-demo-shop', contact)
    await vi.waitFor(() => expect(createOrder).toHaveBeenCalledTimes(2))

    oldGate.reject(new Error('旧账号结算失败'))
    expect(await oldResult).toBeInstanceOf(Error)
    expect(context.orders.checkoutPending).toBe(true)
    expect(context.orders.error).toBeNull()

    newGate.resolve(undefined)
    const newOrder = await newCheckout
    expect(context.orders.checkoutPending).toBe(false)
    expect(context.orders.currentOrder?.id).toBe(newOrder.id)
  })

  it('keeps a newer same-account checkout flight active when the older flight rejects', async () => {
    const data = seedWithSecondUser()
    data.carts['user-demo'] = [
      { productId: 'product-tasting', quantity: 1, unitPriceCents: 5900 },
      { productId: 'product-other-merchant', quantity: 1, unitPriceCents: 7200 },
    ]
    const context = createCommerceContext(data)
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    await context.catalog.load()
    await context.cart.load()

    const originalCreateOrder = context.repository.createOrder.bind(context.repository)
    const oldGate = deferred<void>()
    const newGate = deferred<void>()
    const createOrder = vi.spyOn(context.repository, 'createOrder').mockImplementation(async (actor, lines, orderContact, key) => {
      const gate = lines.some(({ productId }) => productId === 'product-tasting') ? oldGate : newGate
      await gate.promise
      return originalCreateOrder(actor, lines, orderContact, key)
    })

    const oldCheckout = context.orders.checkout('merchant-demo-shop', contact)
    const oldResult = oldCheckout.catch((error: unknown) => error)
    await vi.waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
    const newCheckout = context.orders.checkout('merchant-other-shop', contact)
    await vi.waitFor(() => expect(createOrder).toHaveBeenCalledTimes(2))

    oldGate.reject(new Error('较早结算失败'))
    expect(await oldResult).toBeInstanceOf(Error)
    expect(context.orders.checkoutPending).toBe(true)
    expect(context.orders.error).toBeNull()

    const joinedCheckout = context.orders.checkout('merchant-other-shop', contact)
    expect(createOrder).toHaveBeenCalledTimes(2)
    newGate.resolve(undefined)
    const [newOrder, joinedOrder] = await Promise.all([newCheckout, joinedCheckout])
    expect(joinedOrder.id).toBe(newOrder.id)
    expect(context.orders.checkoutPending).toBe(false)
    expect(context.orders.currentOrder?.id).toBe(newOrder.id)
  })

  it('keeps the new account payment flight isolated from an old payment rejection', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    const oldActor: Actor = { userId: 'user-demo', role: 'USER' }
    const oldOrder = await context.repository.createOrder(
      oldActor,
      [{ productId: 'product-tasting', quantity: 1 }],
      contact,
      'checkout-payment-old-actor',
    )
    const newOrder = await context.repository.createOrder(
      userBActor,
      [{ productId: 'product-tasting', quantity: 1 }],
      contact,
      'checkout-payment-new-actor',
    )
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })

    const originalPayOrder = context.repository.payOrder.bind(context.repository)
    const oldGate = deferred<void>()
    const newGate = deferred<void>()
    const payOrder = vi.spyOn(context.repository, 'payOrder').mockImplementation(async (actor, orderId, result) => {
      await (actor.userId === 'user-demo' ? oldGate.promise : newGate.promise)
      return originalPayOrder(actor, orderId, result)
    })

    const oldPayment = context.orders.pay(oldOrder.id, 'SUCCESS')
    const oldResult = oldPayment.catch((error: unknown) => error)
    await vi.waitFor(() => expect(payOrder).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    const newPayment = context.orders.pay(newOrder.id, 'SUCCESS')
    await vi.waitFor(() => expect(payOrder).toHaveBeenCalledTimes(2))

    oldGate.reject(new Error('旧账号支付失败'))
    expect(await oldResult).toBeInstanceOf(Error)
    expect(context.orders.paymentPending).toBe(true)
    expect(context.orders.error).toBeNull()

    newGate.resolve(undefined)
    const paid = await newPayment
    expect(context.orders.paymentPending).toBe(false)
    expect(context.orders.currentOrder?.id).toBe(paid.id)
  })

  it('keeps a newer same-account payment flight active when the older flight rejects', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    const actor: Actor = { userId: 'user-demo', role: 'USER' }
    const oldOrder = await context.repository.createOrder(
      actor,
      [{ productId: 'product-tasting', quantity: 1 }],
      contact,
      'checkout-payment-same-actor-old',
    )
    const newOrder = await context.repository.createOrder(
      actor,
      [{ productId: 'product-other-merchant', quantity: 1 }],
      contact,
      'checkout-payment-same-actor-new',
    )
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })

    const originalPayOrder = context.repository.payOrder.bind(context.repository)
    const oldGate = deferred<void>()
    const newGate = deferred<void>()
    const payOrder = vi.spyOn(context.repository, 'payOrder').mockImplementation(async (requestActor, orderId, result) => {
      await (orderId === oldOrder.id ? oldGate.promise : newGate.promise)
      return originalPayOrder(requestActor, orderId, result)
    })

    const oldPayment = context.orders.pay(oldOrder.id, 'SUCCESS')
    const oldResult = oldPayment.catch((error: unknown) => error)
    await vi.waitFor(() => expect(payOrder).toHaveBeenCalledTimes(1))
    const newPayment = context.orders.pay(newOrder.id, 'SUCCESS')
    await vi.waitFor(() => expect(payOrder).toHaveBeenCalledTimes(2))

    oldGate.reject(new Error('较早支付失败'))
    expect(await oldResult).toBeInstanceOf(Error)
    expect(context.orders.paymentPending).toBe(true)
    expect(context.orders.error).toBeNull()

    newGate.resolve(undefined)
    const paid = await newPayment
    expect(context.orders.paymentPending).toBe(false)
    expect(context.orders.currentOrder?.id).toBe(paid.id)
  })

  it('does not commit an old account order list after the actor changes', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const oldOrders = await context.repository.listOrders(context.auth.actor!)
    const oldResponse = deferred<Order[]>()
    const listOrders = vi.spyOn(context.repository, 'listOrders').mockReturnValueOnce(oldResponse.promise)

    const staleLoad = context.orders.loadOrders().catch(() => [])
    await vi.waitFor(() => expect(listOrders).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    oldResponse.resolve(oldOrders)
    await staleLoad

    expect(context.orders.orders).toEqual([])
    expect(context.orders.currentOrder).toBeNull()
  })

  it('only commits the newest same-account order-list response', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const seededOrders = await context.repository.listOrders(context.auth.actor!)
    const oldResponse = deferred<Order[]>()
    const newResponse = deferred<Order[]>()
    const listOrders = vi.spyOn(context.repository, 'listOrders')
      .mockReturnValueOnce(oldResponse.promise)
      .mockReturnValueOnce(newResponse.promise)

    const oldLoad = context.orders.loadOrders()
    const newLoad = context.orders.loadOrders()
    await vi.waitFor(() => expect(listOrders).toHaveBeenCalledTimes(2))
    const newestOrders = seededOrders.slice(1)
    newResponse.resolve(newestOrders)
    await newLoad
    expect(context.orders.orders).toEqual(newestOrders)

    oldResponse.resolve(seededOrders.slice(0, 1))
    await oldLoad
    expect(context.orders.orders).toEqual(newestOrders)
  })

  it('rejects an old-account order detail response after the actor changes', async () => {
    const context = createCommerceContext(seedWithSecondUser())
    await context.auth.login({ username: 'user_demo', password: 'Demo123!' })
    const order = await context.repository.getOrder(context.auth.actor!, 'order-shipped')
    const oldResponse = deferred<Order>()
    const getOrder = vi.spyOn(context.repository, 'getOrder').mockReturnValueOnce(oldResponse.promise)

    const staleLoad = context.orders.loadOrder(order.id).catch((error: unknown) => error)
    await vi.waitFor(() => expect(getOrder).toHaveBeenCalledTimes(1))
    await context.auth.login({ username: 'user_b', password: 'Demo123!' })
    oldResponse.resolve(order)

    expect(await staleLoad).toBeInstanceOf(Error)
    expect(context.orders.currentOrder).toBeNull()
    expect(context.orders.orders).toEqual([])
  })
})
