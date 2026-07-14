import type { AfterSaleStatus, BookingStatus, OrderStatus, ProductStatus } from './types'

type TransitionMap<State extends string> = Readonly<Record<State, Readonly<Record<string, State>>>>

export class DomainTransitionError extends Error {
  constructor(machine: string, from: string, event: string) {
    super(`非法${machine}状态转换: ${from} --${event}-->`)
    this.name = 'DomainTransitionError'
  }
}

const orderTransitions: TransitionMap<OrderStatus> = {
  PENDING_PAYMENT: { PAY_SUCCESS: 'PAID', PAY_FAILURE: 'PENDING_PAYMENT', CANCEL: 'CANCELLED' },
  PAID: { SHIP: 'SHIPPED' },
  SHIPPED: { RECEIVE: 'RECEIVED' },
  RECEIVED: { COMPLETE: 'COMPLETED' },
  COMPLETED: {},
  CANCELLED: {},
}

const productTransitions: TransitionMap<ProductStatus> = {
  DRAFT: { SUBMIT: 'PENDING' },
  PENDING: { APPROVE: 'APPROVED', REJECT: 'REJECTED' },
  APPROVED: { OFF_SHELF: 'OFF_SHELF' },
  REJECTED: { EDIT: 'DRAFT' },
  OFF_SHELF: {},
}

const afterSaleTransitions: TransitionMap<AfterSaleStatus> = {
  REQUESTED: { PROCESS: 'PROCESSING' },
  PROCESSING: { APPROVE: 'APPROVED', REJECT: 'REJECTED' },
  APPROVED: { REFUND: 'REFUNDED' },
  REJECTED: { CLOSE: 'CLOSED' },
  REFUNDED: { CLOSE: 'CLOSED' },
  CLOSED: {},
}

const bookingTransitions: TransitionMap<BookingStatus> = {
  PENDING: { VERIFY: 'VERIFIED', CANCEL: 'CANCELLED' },
  VERIFIED: {},
  CANCELLED: {},
}

function transition<State extends string>(
  machine: string,
  state: State,
  event: string,
  transitions: TransitionMap<State>,
): State {
  const stateTransitions = transitions[state]

  if (stateTransitions === undefined || !Object.prototype.hasOwnProperty.call(stateTransitions, event)) {
    throw new DomainTransitionError(machine, state, event)
  }

  return stateTransitions[event] as State
}

export function transitionOrder(status: OrderStatus, event: string): OrderStatus {
  return transition('订单', status, event, orderTransitions)
}

export function transitionProduct(status: ProductStatus, event: string): ProductStatus {
  return transition('商品', status, event, productTransitions)
}

export function transitionAfterSale(status: AfterSaleStatus, event: string): AfterSaleStatus {
  return transition('售后', status, event, afterSaleTransitions)
}

export function transitionBooking(status: BookingStatus, event: string): BookingStatus {
  return transition('预约', status, event, bookingTransitions)
}
