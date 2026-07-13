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

export type OrderRequestLine = Pick<CartLine, 'productId' | 'quantity'>

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
  getCart(userId: string): Promise<CartLine[]>
  saveCart(userId: string, lines: CartLine[]): Promise<CartLine[]>
  createOrder(userId: string, lines: OrderRequestLine[], contact: OrderContact): Promise<Order>
  listOrders(actor: Actor): Promise<Order[]>
  getOrder(actor: Actor, orderId: string): Promise<Order>
  payOrder(orderId: string, result: 'SUCCESS' | 'FAILURE' | 'CANCEL'): Promise<Order>
  shipOrder(actor: Actor, orderId: string): Promise<Order>
  receiveOrder(actor: Actor, orderId: string): Promise<Order>
  listAfterSales(actor: Actor): Promise<AfterSale[]>
  requestAfterSale(actor: Actor, orderId: string, reason: string): Promise<AfterSale>
  resolveAfterSale(actor: Actor, afterSaleId: string, decision: 'APPROVE' | 'REJECT', note: string): Promise<AfterSale>
  listBookings(actor: Actor): Promise<Booking[]>
  createBooking(actor: Actor, input: BookingInput): Promise<Booking>
  cancelBooking(actor: Actor, bookingId: string): Promise<Booking>
  verifyBooking(actor: Actor, code: string): Promise<Booking>
  getMerchantApplication(userId: string): Promise<MerchantApplication | null>
  applyMerchant(actor: Actor, input: MerchantApplicationInput): Promise<MerchantApplication>
  listMerchantApplications(actor: Actor): Promise<MerchantApplication[]>
  reviewMerchant(actor: Actor, applicationId: string, decision: ReviewDecision): Promise<MerchantApplication>
  saveProduct(actor: Actor, input: ProductDraftInput): Promise<Product>
  submitProduct(actor: Actor, productId: string): Promise<Product>
  reviewProduct(actor: Actor, productId: string, decision: ReviewDecision): Promise<Product>
  saveContent(actor: Actor, input: ContentInput): Promise<ContentArticle>
  dashboard(actor: Actor): Promise<DashboardMetrics>
  reset(): Promise<void>
}
