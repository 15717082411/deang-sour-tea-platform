import {
  DomainTransitionError,
  transitionAfterSale,
  transitionBooking,
  transitionOrder,
  transitionProduct,
} from '../../domain/stateMachines'

describe('domain state machines', () => {
  it('transitions an order through payment, fulfilment, and completion', () => {
    expect(transitionOrder('PENDING_PAYMENT', 'PAY_SUCCESS')).toBe('PAID')
    expect(transitionOrder('PAID', 'SHIP')).toBe('SHIPPED')
    expect(transitionOrder('SHIPPED', 'RECEIVE')).toBe('RECEIVED')
    expect(transitionOrder('RECEIVED', 'COMPLETE')).toBe('COMPLETED')
  })

  it('keeps failed payment pending and allows cancellation before payment', () => {
    expect(transitionOrder('PENDING_PAYMENT', 'PAY_FAILURE')).toBe('PENDING_PAYMENT')
    expect(transitionOrder('PENDING_PAYMENT', 'CANCEL')).toBe('CANCELLED')
  })

  it('allows after-sale requests from paid, shipped, and received orders', () => {
    expect(transitionOrder('PAID', 'REQUEST_AFTER_SALE')).toBe('AFTER_SALE_REQUESTED')
    expect(transitionOrder('SHIPPED', 'REQUEST_AFTER_SALE')).toBe('AFTER_SALE_REQUESTED')
    expect(transitionOrder('RECEIVED', 'REQUEST_AFTER_SALE')).toBe('AFTER_SALE_REQUESTED')
  })

  it('rejects invalid order transitions with the domain error', () => {
    expect(() => transitionOrder('PENDING_PAYMENT', 'SHIP')).toThrow('非法订单状态转换')
    expect(() => transitionOrder('COMPLETED', 'COMPLETE')).toThrow(DomainTransitionError)
  })

  it('transitions a product through review and resubmission', () => {
    expect(transitionProduct('DRAFT', 'SUBMIT')).toBe('PENDING')
    expect(transitionProduct('PENDING', 'APPROVE')).toBe('APPROVED')
    expect(transitionProduct('PENDING', 'REJECT')).toBe('REJECTED')
    expect(transitionProduct('REJECTED', 'EDIT')).toBe('DRAFT')
    expect(transitionProduct('APPROVED', 'OFF_SHELF')).toBe('OFF_SHELF')
  })

  it('rejects invalid product transitions', () => {
    expect(() => transitionProduct('DRAFT', 'APPROVE')).toThrow('非法商品状态转换')
  })

  it('transitions an after-sale request to closure through refund or rejection', () => {
    expect(transitionAfterSale('REQUESTED', 'PROCESS')).toBe('PROCESSING')
    expect(transitionAfterSale('PROCESSING', 'APPROVE')).toBe('APPROVED')
    expect(transitionAfterSale('PROCESSING', 'REJECT')).toBe('REJECTED')
    expect(transitionAfterSale('APPROVED', 'REFUND')).toBe('REFUNDED')
    expect(transitionAfterSale('REFUNDED', 'CLOSE')).toBe('CLOSED')
    expect(transitionAfterSale('REJECTED', 'CLOSE')).toBe('CLOSED')
  })

  it('rejects invalid after-sale transitions', () => {
    expect(() => transitionAfterSale('REQUESTED', 'REFUND')).toThrow('非法售后状态转换')
  })

  it('verifies or cancels a pending booking', () => {
    expect(transitionBooking('PENDING', 'VERIFY')).toBe('VERIFIED')
    expect(transitionBooking('PENDING', 'CANCEL')).toBe('CANCELLED')
  })

  it('rejects repeated booking operations', () => {
    expect(() => transitionBooking('VERIFIED', 'VERIFY')).toThrow('非法预约状态转换')
  })
})
