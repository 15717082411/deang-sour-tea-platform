import { describe, expect, it, vi } from 'vitest'
import type { Actor } from '../../domain/types'
import { ApiBusinessError, ApiUnavailableError, type ApiHttpClient } from '../../data/apiClient'
import { createApiRepository } from '../../data/apiRepository'

function client(): ApiHttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}

const userActor: Actor = { userId: '1', role: 'USER' }

describe('Spring Boot API repository', () => {
  it('normalizes numeric product ids and decimal yuan prices', async () => {
    const http = client()
    vi.mocked(http.get).mockResolvedValue({ data: { code: 0, message: 'ok', data: [{
      id: 2,
      merchantId: 1,
      merchantName: '酸茶工坊',
      name: '45天发酵酸茶体验装',
      category: '体验装',
      price: '59.00',
      stock: 80,
      sales: 4,
      description: '微酸回甘的体验装。',
      image: '/images/product-tasting.webp',
      status: 'APPROVED',
    }] } })

    const products = await createApiRepository(http).listProducts()

    expect(products).toEqual([expect.objectContaining({
      id: '2', merchantId: '1', priceCents: 5900, stock: 80, status: 'APPROVED',
    })])
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an unsafe numeric API id: %s',
    async (unsafeId) => {
      const http = client()
      vi.mocked(http.get).mockResolvedValue({ data: { code: 0, message: 'ok', data: [{
        id: unsafeId, merchantId: 1, name: '测试商品', category: '体验装', price: '59.00',
        stock: 1, sales: 0, status: 'APPROVED',
      }] } })

      await expect(createApiRepository(http).listProducts()).rejects.toBeInstanceOf(ApiBusinessError)
    },
  )

  it('rejects an explicitly malformed integer instead of coercing it to zero', async () => {
    const http = client()
    vi.mocked(http.get).mockResolvedValue({ data: { code: 0, message: 'ok', data: [{
      id: 2, merchantId: 1, name: '测试商品', category: '体验装', priceCents: 'invalid',
      stock: 1, sales: 0, status: 'APPROVED',
    }] } })

    await expect(createApiRepository(http).listProducts()).rejects.toBeInstanceOf(ApiBusinessError)
  })

  it('normalizes orderNo, totalAmount, lines, contact and timestamps', async () => {
    const http = client()
    vi.mocked(http.get).mockResolvedValue({ data: { code: 0, message: 'ok', data: [{
      id: 8,
      orderNo: 'DST-API-008',
      userId: 1,
      merchantId: 3,
      totalAmount: '168.00',
      status: 'PAID',
      createdAt: '2026-07-13T12:30:00',
      contact: { recipient: '体验用户', phone: '13800138000', address: '云南省德宏州芒市' },
      lines: [{ productId: 2, productName: '德昂古树酸茶礼盒', image: '/images/product-gift.webp', price: '168.00', quantity: 1 }],
      timeline: [{ status: 'PAID', label: '支付成功', at: '2026-07-13T12:30:00' }],
    }] } })

    const orders = await createApiRepository(http).listOrders(userActor)

    expect(orders[0]).toMatchObject({
      id: '8', orderNo: 'DST-API-008', userId: '1', merchantId: '3', totalCents: 16800,
      lines: [{ productId: '2', unitPriceCents: 16800, quantity: 1 }],
      createdAt: '2026-07-13T12:30:00',
    })
  })

  it('throws ApiBusinessError for a nonzero response envelope', async () => {
    const http = client()
    vi.mocked(http.get).mockResolvedValue({ data: { code: 409, message: '当前订单不能发货', data: null } })

    const error = await createApiRepository(http).listOrders(userActor).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiBusinessError)
    expect(error).toMatchObject({ code: 409, message: '当前订单不能发货' })
  })

  it('converts Axios timeout and network failures to ApiUnavailableError', async () => {
    const http = client()
    vi.mocked(http.get).mockRejectedValue({ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout' })

    await expect(createApiRepository(http).listProducts()).rejects.toBeInstanceOf(ApiUnavailableError)
  })
})
