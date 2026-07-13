import type {
  Actor,
  AfterSale,
  AuthSession,
  Booking,
  BookingInput,
  CartLine,
  ContentArticle,
  ContentInput,
  DashboardMetrics,
  LoginInput,
  MerchantApplication,
  MerchantApplicationInput,
  Order,
  OrderContact,
  Product,
  ProductDraftInput,
  ProductQuery,
  RegisterInput,
  ReviewDecision,
  User,
} from '../domain/types'

export type CartRequestLine = Pick<CartLine, 'productId' | 'quantity'>
export type RepositoryErrorCode =
  | 'CONTENT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_FORBIDDEN'
  | 'ORDER_RECEIVE_INVALID_STATUS'
  | 'AFTER_SALE_NOT_FOUND'
  | 'AFTER_SALE_FORBIDDEN'
  | 'AFTER_SALE_REASON_REQUIRED'
  | 'AFTER_SALE_DUPLICATE'
  | 'AFTER_SALE_INVALID_STATUS'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_FORBIDDEN'
  | 'BOOKING_INVALID_DATE'
  | 'BOOKING_INVALID_PEOPLE'
  | 'BOOKING_INVALID_PHONE'
  | 'BOOKING_POSTER_INVALID'
  | 'BOOKING_CODE_INVALID'
  | 'BOOKING_CODE_USED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CANCEL_INVALID_STATUS'

export class RepositoryError extends Error {
  constructor(
    public readonly code: RepositoryErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export function hasRepositoryErrorCode(error: unknown, code: RepositoryErrorCode): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export interface PlatformRepository {
  login(input: LoginInput): Promise<AuthSession>
  register(input: RegisterInput): Promise<AuthSession>
  validateSession(userId: string, sessionId: string): Promise<AuthSession>
  logout(sessionId: string): Promise<void>
  getUser(userId: string): Promise<User>
  listProducts(query?: ProductQuery): Promise<Product[]>
  getProduct(productId: string): Promise<Product>
  listContents(): Promise<ContentArticle[]>
  getContent(slug: string): Promise<ContentArticle>
  getCart(actor: Actor): Promise<CartLine[]>
  saveCart(actor: Actor, lines: CartRequestLine[]): Promise<CartLine[]>
  mergeCart(actor: Actor, guestLines: CartRequestLine[]): Promise<CartLine[]>
  createOrder(actor: Actor, lines: CartRequestLine[], contact: OrderContact, idempotencyKey: string): Promise<Order>
  listOrders(actor: Actor): Promise<Order[]>
  getOrder(actor: Actor, orderId: string): Promise<Order>
  payOrder(actor: Actor, orderId: string, result: 'SUCCESS' | 'FAILURE' | 'CANCEL'): Promise<Order>
  shipOrder(actor: Actor, orderId: string): Promise<Order>
  receiveOrder(actor: Actor, orderId: string): Promise<Order>
  listAfterSales(actor: Actor): Promise<AfterSale[]>
  requestAfterSale(actor: Actor, orderId: string, reason: string): Promise<AfterSale>
  resolveAfterSale(actor: Actor, afterSaleId: string, decision: 'APPROVE' | 'REJECT', note: string): Promise<AfterSale>
  refundAfterSale(actor: Actor, afterSaleId: string, note: string): Promise<AfterSale>
  listBookings(actor: Actor): Promise<Booking[]>
  createBooking(actor: Actor, input: BookingInput): Promise<Booking>
  cancelBooking(actor: Actor, bookingId: string): Promise<Booking>
  verifyBooking(actor: Actor, code: string): Promise<Booking>
  getMerchantApplication(userId: string): Promise<MerchantApplication | null>
  applyMerchant(actor: Actor, input: MerchantApplicationInput): Promise<MerchantApplication>
  listMerchantProducts(actor: Actor): Promise<Product[]>
  listMerchantApplications(actor: Actor): Promise<MerchantApplication[]>
  listAdminProducts(actor: Actor): Promise<Product[]>
  listAdminContents(actor: Actor): Promise<ContentArticle[]>
  reviewMerchant(actor: Actor, applicationId: string, decision: ReviewDecision): Promise<MerchantApplication>
  saveProduct(actor: Actor, input: ProductDraftInput): Promise<Product>
  submitProduct(actor: Actor, productId: string): Promise<Product>
  reviewProduct(actor: Actor, productId: string, decision: ReviewDecision): Promise<Product>
  saveContent(actor: Actor, input: ContentInput): Promise<ContentArticle>
  dashboard(actor: Actor): Promise<DashboardMetrics>
  reset(): Promise<void>
}
