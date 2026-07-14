import { calculateCartTotal } from '../../utils/money'
import { createBusinessId } from '../../utils/identifiers'
import { isValidPhone } from '../../utils/validation'

describe('calculateCartTotal', () => {
  it('multiplies integer-cent unit prices by quantities', () => {
    expect(calculateCartTotal([{ unitPriceCents: 5900, quantity: 2 }])).toBe(11800)
  })

  it('adds quantities across multiple cart lines', () => {
    expect(
      calculateCartTotal([
        { unitPriceCents: 5900, quantity: 2 },
        { unitPriceCents: 1250, quantity: 3 },
      ]),
    ).toBe(15550)
  })

  it('returns zero for an empty cart', () => {
    expect(calculateCartTotal([])).toBe(0)
  })

  it.each([
    { unitPriceCents: 12.5, quantity: 1 },
    { unitPriceCents: Number.MAX_SAFE_INTEGER + 1, quantity: 1 },
    { unitPriceCents: 100, quantity: 1.5 },
    { unitPriceCents: 100, quantity: 0 },
    { unitPriceCents: 100, quantity: -1 },
  ])('rejects cart lines with invalid monetary values', (line) => {
    expect(() => calculateCartTotal([line])).toThrow(RangeError)
  })

  it('rejects cart totals outside the safe integer range', () => {
    expect(() =>
      calculateCartTotal([
        { unitPriceCents: Number.MAX_SAFE_INTEGER, quantity: 1 },
        { unitPriceCents: 1, quantity: 1 },
      ]),
    ).toThrow(RangeError)
  })
})

describe('domain utility primitives', () => {
  it('accepts mainland China mobile numbers and rejects malformed values', () => {
    expect(isValidPhone('13800138000')).toBe(true)
    expect(isValidPhone('12800138000')).toBe(false)
    expect(isValidPhone('1380013800')).toBe(false)
  })

  it('creates distinct, normalized business IDs', () => {
    expect(createBusinessId('order')).toMatch(/^ORDER-[a-z0-9]+-[a-z0-9]{4}$/)
    expect(createBusinessId('ORDER')).not.toBe(createBusinessId('ORDER'))
  })

  it('rejects invalid business ID prefixes', () => {
    expect(() => createBusinessId('1order')).toThrow('业务 ID 前缀必须以字母开头')
  })
})
