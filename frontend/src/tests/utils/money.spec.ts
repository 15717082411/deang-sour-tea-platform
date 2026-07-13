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
