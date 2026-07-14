import type { CartRequestLine } from '../data/repository'

export const GUEST_CART_STORAGE_KEY = 'deang-sour-tea:guest-cart:v1'
const GUEST_CART_VERSION = 1

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

function normalizeLines(values: readonly unknown[]): CartRequestLine[] {
  const quantities = new Map<string, number>()
  for (const value of values) {
    if (!isRecord(value)) continue
    const { productId, quantity } = value
    if (typeof productId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(productId)) continue
    if (!Number.isSafeInteger(quantity) || (quantity as number) <= 0) continue
    const combined = (quantities.get(productId) ?? 0) + (quantity as number)
    if (Number.isSafeInteger(combined)) quantities.set(productId, combined)
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }))
}

export function writeGuestCart(lines: readonly unknown[], storage: Storage = window.localStorage): CartRequestLine[] {
  const normalized = normalizeLines(lines)
  if (normalized.length === 0) {
    storage.removeItem(GUEST_CART_STORAGE_KEY)
    return []
  }
  storage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({ version: GUEST_CART_VERSION, lines: normalized }))
  return normalized
}

export function readGuestCart(storage: Storage = window.localStorage): CartRequestLine[] {
  const serialized = storage.getItem(GUEST_CART_STORAGE_KEY)
  if (serialized === null) return []
  try {
    const parsed: unknown = JSON.parse(serialized)
    if (!isRecord(parsed) || parsed.version !== GUEST_CART_VERSION || !Array.isArray(parsed.lines)) {
      storage.removeItem(GUEST_CART_STORAGE_KEY)
      return []
    }
    return writeGuestCart(parsed.lines, storage)
  } catch {
    storage.removeItem(GUEST_CART_STORAGE_KEY)
    return []
  }
}

export function clearGuestCart(storage: Storage = window.localStorage): void {
  storage.removeItem(GUEST_CART_STORAGE_KEY)
}
