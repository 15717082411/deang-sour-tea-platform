export type Role = 'GUEST' | 'USER' | 'MERCHANT' | 'ADMIN'
export type MerchantStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type ProductStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'OFF_SHELF'
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'
export type AfterSaleStatus = 'REQUESTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CLOSED'
export type BookingStatus = 'PENDING' | 'VERIFIED' | 'CANCELLED'

export interface User {
  id: string
  username: string
  displayName: string
  phone: string
  role: Exclude<Role, 'GUEST'>
  merchantStatus: MerchantStatus
  merchantId?: string
}

export interface MerchantApplication {
  id: string
  userId: string
  shopName: string
  contact: string
  location: string
  introduction: string
  status: Exclude<MerchantStatus, 'NONE'>
  reviewReason?: string
  agreementAcceptedAt?: string
  createdAt: string
}

export interface ContentSource {
  title: string
  publisher: string
  url: string
  claim: string
}

export interface ContentArticle {
  id: string
  slug: string
  title: string
  category: string
  summary: string
  body: string
  cover: string
  sources: ContentSource[]
  published: boolean
}

export interface Product {
  id: string
  merchantId: string
  merchantName?: string
  name: string
  category: string
  priceCents: number
  stock: number
  sales: number
  description: string
  image: string
  status: ProductStatus
  reviewReason?: string
}

export interface CartLine {
  productId: string
  quantity: number
  unitPriceCents: number
}

export interface OrderLine extends CartLine {
  productName: string
  image: string
}

export interface TimelineEvent {
  status: string
  label: string
  at: string
  note?: string
  timeKnown?: boolean
}

export interface Order {
  id: string
  orderNo: string
  userId: string
  merchantId: string
  lines: OrderLine[]
  totalCents: number
  status: OrderStatus
  contact: OrderContact
  timeline: TimelineEvent[]
  createdAt: string
  idempotencyKey?: string
}

export interface AfterSale {
  id: string
  orderId: string
  userId: string
  merchantId: string
  reason: string
  status: AfterSaleStatus
  resolutionNote?: string
  timeline: TimelineEvent[]
}

export interface Booking {
  id: string
  userId: string
  date: string
  people: number
  phone: string
  posterId?: string
  code: string
  status: BookingStatus
  timeline: TimelineEvent[]
  createdAt: string
  verifiedAt?: string
  verifiedBy?: string
}

export interface JourneyChoice {
  stepId: string
  optionId: string
  trait: 'PURE' | 'FRESH' | 'WARM'
}

export interface JourneyRecipe {
  id: string
  name: '本真原味' | '山野清新' | '温润花香'
  ingredients: string[]
  description: string
}

export interface JourneyPoster {
  id: string
  userId?: string
  recipe: JourneyRecipe
  code: string
  createdAt: string
}

export interface Actor {
  userId: string
  role: Exclude<Role, 'GUEST'>
  merchantId?: string
}

export interface LoginInput {
  username: string
  password: string
}

export interface RegisterInput extends LoginInput {
  phone: string
  displayName?: string
}

export interface AuthSession {
  sessionId: string
  user: User
}

export interface ProductQuery {
  keyword?: string
  category?: string
  inStock?: boolean
  sort?: 'PRICE_ASC' | 'PRICE_DESC'
}

export interface OrderContact {
  recipient: string
  phone: string
  address: string
}

export interface BookingInput {
  date: string
  people: number
  phone: string
  posterId?: string
}

export interface MerchantApplicationInput {
  shopName: string
  contact: string
  location: string
  introduction: string
  agreementAccepted: boolean
}

export interface ReviewDecision {
  result: 'APPROVE' | 'REJECT'
  reason?: string
}

export interface ProductDraftInput {
  id?: string
  name: string
  category: string
  priceCents: number
  stock: number
  description: string
  image: string
}

export interface ContentInput {
  id?: string
  title: string
  slug: string
  category: string
  summary: string
  body: string
  cover: string
  sources: ContentSource[]
  published: boolean
}

export interface DashboardMetrics {
  revenueCents: number
  orderCount: number
  productCount: number
  bookingCount: number
  afterSaleCount: number
}
