import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { CartRequestLine } from '../data/repository'
import type { CartLine, Product } from '../domain/types'
import { calculateCartTotal } from '../utils/money'
import { readGuestCart, writeGuestCart } from '../utils/guestCart'
import { useAppStore } from './app'
import { useAuthStore } from './auth'
import { useCatalogStore } from './catalog'

export interface CartItem {
  productId: string
  quantity: number
  unitPriceCents: number
  product: Product | null
  merchantId: string
  merchantName: string
  subtotalCents: number
  invalidReason: string | null
}

export interface CartGroup {
  merchantId: string
  merchantName: string
  items: CartItem[]
  subtotalCents: number
  invalid: boolean
}

function invalidReason(product: Product | null, quantity: number): string | null {
  if (product === null) return '商品已不存在'
  if (product.status !== 'APPROVED') return '商品当前不可购买'
  if (product.stock <= 0) return '商品已售罄'
  if (quantity > product.stock) return `库存仅剩 ${product.stock} 件`
  return null
}

export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()
  const catalog = useCatalogStore()
  const guestLines = ref<CartRequestLine[]>([])
  const userLines = ref<CartLine[]>([])
  const boundUserId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeLines = computed<readonly (CartRequestLine | CartLine)[]>(() => {
    if (auth.user === null) return guestLines.value
    if (auth.user.role === 'USER' && boundUserId.value === auth.user.id) return userLines.value
    return []
  })

  const items = computed<CartItem[]>(() => activeLines.value.map((line) => {
    const product = catalog.productById(line.productId) ?? null
    const persistedPrice = 'unitPriceCents' in line && typeof line.unitPriceCents === 'number' ? line.unitPriceCents : 0
    const unitPriceCents = product?.priceCents ?? persistedPrice
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPriceCents,
      product,
      merchantId: product?.merchantId ?? 'unknown',
      merchantName: product?.merchantName ?? '商品所属商家',
      subtotalCents: unitPriceCents * line.quantity,
      invalidReason: invalidReason(product, line.quantity),
    }
  }))

  const groups = computed<CartGroup[]>(() => {
    const byMerchant = new Map<string, CartGroup>()
    for (const item of items.value) {
      const group = byMerchant.get(item.merchantId) ?? {
        merchantId: item.merchantId,
        merchantName: item.merchantName,
        items: [],
        subtotalCents: 0,
        invalid: false,
      }
      group.items.push(item)
      group.subtotalCents += item.subtotalCents
      group.invalid ||= item.invalidReason !== null
      byMerchant.set(item.merchantId, group)
    }
    return [...byMerchant.values()]
  })

  const subtotalCents = computed(() => calculateCartTotal(items.value.map(({ unitPriceCents, quantity }) => ({ unitPriceCents, quantity }))))

  async function persist(lines: CartRequestLine[]): Promise<void> {
    if (auth.user === null) {
      guestLines.value = writeGuestCart(lines)
      return
    }
    if (auth.user.role !== 'USER' || auth.actor === null) throw new Error('当前身份不可使用购物车')
    if (boundUserId.value !== auth.user.id) {
      boundUserId.value = auth.user.id
      userLines.value = await useAppStore().repository.getCart(auth.actor)
    }
    userLines.value = await useAppStore().repository.saveCart(auth.actor, lines)
  }

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await catalog.load()
      if (auth.user === null) {
        boundUserId.value = null
        userLines.value = []
        guestLines.value = readGuestCart()
        await catalog.refreshProducts(guestLines.value.map(({ productId }) => productId))
        return
      }
      guestLines.value = readGuestCart()
      if (auth.user.role !== 'USER' || auth.actor === null) {
        boundUserId.value = null
        userLines.value = []
        return
      }
      boundUserId.value = auth.user.id
      userLines.value = await useAppStore().repository.getCart(auth.actor)
      await catalog.refreshProducts(userLines.value.map(({ productId }) => productId))
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : '购物车加载失败'
      throw caught
    } finally {
      loading.value = false
    }
  }

  async function add(productId: string, quantity = 1): Promise<void> {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('商品数量无效')
    const product = await catalog.get(productId)
    if (product.status !== 'APPROVED' || product.stock <= 0) throw new Error('商品不可购买')
    const current = activeLines.value.find((line) => line.productId === productId)?.quantity ?? 0
    const nextQuantity = Math.min(current + quantity, product.stock)
    const next = activeLines.value.filter((line) => line.productId !== productId).map(({ productId, quantity }) => ({ productId, quantity }))
    next.push({ productId, quantity: nextQuantity })
    await persist(next)
  }

  async function setQuantity(productId: string, quantity: number): Promise<void> {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('商品数量无效')
    const product = await catalog.get(productId)
    const next = activeLines.value.map((line) => ({
      productId: line.productId,
      quantity: line.productId === productId ? Math.min(quantity, product.stock) : line.quantity,
    }))
    await persist(next)
  }

  async function remove(productId: string): Promise<void> {
    await persist(activeLines.value.filter((line) => line.productId !== productId).map(({ productId, quantity }) => ({ productId, quantity })))
  }

  async function clear(): Promise<void> {
    await persist([])
  }

  async function removeMerchant(merchantId: string): Promise<void> {
    const purchasedIds = new Set(items.value.filter((item) => item.merchantId === merchantId).map(({ productId }) => productId))
    await persist(activeLines.value.filter((line) => !purchasedIds.has(line.productId)).map(({ productId, quantity }) => ({ productId, quantity })))
  }

  return {
    guestLines,
    userLines,
    boundUserId,
    loading,
    error,
    items,
    groups,
    subtotalCents,
    load,
    add,
    setQuantity,
    remove,
    clear,
    removeMerchant,
  }
})
