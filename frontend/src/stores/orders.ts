import { defineStore } from 'pinia'
import type { Order, OrderContact } from '../domain/types'
import { createBusinessId } from '../utils/identifiers'
import { isValidPhone } from '../utils/validation'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { useCartStore } from './cart'
import { useCatalogStore } from './catalog'

type PaymentResult = 'SUCCESS' | 'FAILURE' | 'CANCEL'
type CheckoutFlight = { signature: string; promise: Promise<Order> }
const checkoutFlights = new WeakMap<object, CheckoutFlight>()

function validateContact(contact: OrderContact): OrderContact {
  const normalized = {
    recipient: contact.recipient.trim(),
    phone: contact.phone.trim(),
    address: contact.address.trim(),
  }
  if (!normalized.recipient) throw new Error('请填写收件人')
  if (!isValidPhone(normalized.phone)) throw new Error('请填写11位中国大陆手机号')
  if (!normalized.address) throw new Error('请填写收货地址')
  return normalized
}

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    orders: [] as Order[],
    currentOrder: null as Order | null,
    checkoutPending: false,
    paymentPending: false,
    error: null as string | null,
    checkoutKeys: {} as Record<string, string>,
  }),
  actions: {
    remember(order: Order) {
      const index = this.orders.findIndex(({ id }) => id === order.id)
      if (index === -1) this.orders.unshift(order)
      else this.orders[index] = order
      this.currentOrder = order
    },
    checkout(merchantId: string, contact: OrderContact): Promise<Order> {
      let normalizedContact: OrderContact
      try {
        normalizedContact = validateContact(contact)
      } catch (error) {
        return Promise.reject(error)
      }
      const auth = useAuthStore()
      const cart = useCartStore()
      if (auth.actor === null || auth.user?.role !== 'USER') return Promise.reject(new Error('仅普通用户可以结算'))
      const group = cart.groups.find((candidate) => candidate.merchantId === merchantId)
      if (group === undefined || group.items.length === 0) return Promise.reject(new Error('结算商品不存在'))
      const signature = JSON.stringify({
        userId: auth.actor.userId,
        merchantId,
        contact: normalizedContact,
        lines: group.items.map(({ productId, quantity }) => ({ productId, quantity })).sort((a, b) => a.productId.localeCompare(b.productId)),
      })
      const flight = checkoutFlights.get(this)
      if (flight?.signature === signature) return flight.promise
      const key = this.checkoutKeys[signature] ?? createBusinessId('CHECKOUT')
      this.checkoutKeys[signature] = key
      this.checkoutPending = true
      this.error = null
      const promise = (async () => {
        try {
          const catalog = useCatalogStore()
          await catalog.refreshProducts(group.items.map(({ productId }) => productId))
          const refreshedGroup = cart.groups.find((candidate) => candidate.merchantId === merchantId)
          if (refreshedGroup === undefined || refreshedGroup.invalid) throw new Error('商品价格或库存已变化，请检查购物车')
          if (refreshedGroup.items.some((item) => item.product?.merchantId !== merchantId)) throw new Error('订单仅支持单个商家')
          const lines = refreshedGroup.items.map(({ productId, quantity }) => ({ productId, quantity }))
          const order = await useAppStore().repository.createOrder(auth.actor!, lines, normalizedContact, key)
          await cart.removeMerchant(merchantId)
          this.remember(order)
          return order
        } catch (error) {
          this.error = error instanceof Error ? error.message : '订单创建失败'
          throw error
        }
      })()
      checkoutFlights.set(this, { signature, promise })
      const cleanup = () => {
        this.checkoutPending = false
        if (checkoutFlights.get(this)?.promise === promise) checkoutFlights.delete(this)
      }
      void promise.then(cleanup, cleanup)
      return promise
    },
    async loadOrder(orderId: string): Promise<Order> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权查看该订单')
      const order = await useAppStore().repository.getOrder(auth.actor, orderId)
      this.remember(order)
      return order
    },
    async loadOrders(): Promise<Order[]> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权查看订单')
      this.orders = await useAppStore().repository.listOrders(auth.actor)
      return this.orders
    },
    async pay(orderId: string, result: PaymentResult): Promise<Order> {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'USER') throw new Error('无权支付该订单')
      this.paymentPending = true
      this.error = null
      try {
        const order = await useAppStore().repository.payOrder(auth.actor, orderId, result)
        this.remember(order)
        return order
      } catch (error) {
        this.error = error instanceof Error ? error.message : '支付请求失败'
        throw error
      } finally {
        this.paymentPending = false
      }
    },
  },
})
