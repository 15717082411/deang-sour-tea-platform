import type {
  AfterSale,
  Booking,
  CartLine,
  ContentArticle,
  MerchantApplication,
  Order,
  Product,
  User,
} from '../domain/types'

export interface DemoData {
  users: User[]
  passwords: Record<string, string>
  sessions: Record<string, string>
  products: Product[]
  contents: ContentArticle[]
  carts: Record<string, CartLine[]>
  orders: Order[]
  afterSales: AfterSale[]
  bookings: Booking[]
  merchantApplications: MerchantApplication[]
}

export const DEMO_STORAGE_KEY = 'deang-sour-tea:v3'
export const DEMO_DATA_VERSION = 3

const seedTimestamp = '2026-07-13T00:00:00.000Z'

export function createSeedData(): DemoData {
  return {
    users: [
      { id: 'user-demo', username: 'user_demo', displayName: '体验用户', phone: '13800138000', role: 'USER', merchantStatus: 'PENDING' },
      { id: 'merchant-demo', username: 'merchant_demo', displayName: '酸茶工坊', phone: '13800138001', role: 'MERCHANT', merchantStatus: 'APPROVED', merchantId: 'merchant-demo-shop' },
      { id: 'admin-demo', username: 'admin_demo', displayName: '平台管理员', phone: '13800138002', role: 'ADMIN', merchantStatus: 'NONE' },
    ],
    passwords: { 'user-demo': 'Demo123!', 'merchant-demo': 'Demo123!', 'admin-demo': 'Demo123!' },
    sessions: {},
    products: [
      { id: 'product-tasting', merchantId: 'merchant-demo-shop', name: '45天发酵酸茶体验装', category: '体验装', priceCents: 5900, stock: 80, sales: 1, description: '微酸回甘的入门体验装。', image: '/images/product-tasting.jpg', status: 'APPROVED' },
      { id: 'product-gift', merchantId: 'merchant-demo-shop', name: '德昂古树酸茶礼盒', category: '酸茶礼盒', priceCents: 16800, stock: 36, sales: 1, description: '适合馈赠的古树酸茶礼盒。', image: '/images/product-gift.jpg', status: 'APPROVED' },
      { id: 'product-pending', merchantId: 'merchant-demo-shop', name: '茶魂守护人纪念币', category: '文创周边', priceCents: 3900, stock: 120, sales: 0, description: '等待审核的文创周边。', image: '/images/product-coin.jpg', status: 'PENDING' },
    ],
    contents: [
      { id: 'content-about', slug: 'what-is-sour-tea', title: '德昂族酸茶是什么', category: '酸茶科普', summary: '介绍酸茶的来源与风味。', body: '德昂族酸茶是围绕古法制茶经验形成的非遗体验核心内容。', cover: '/images/content-about.jpg', sources: [], published: true },
      { id: 'content-craft', slug: 'fermentation-craft', title: '杀青、揉捻与45天发酵', category: '制作技艺', summary: '把手工经验拆解为三步。', body: '平台将杀青、揉捻和发酵拆解为互动与线下工坊体验。', cover: '/images/content-craft.jpg', sources: [], published: true },
    ],
    carts: {},
    orders: [
      {
        id: 'order-shipped', orderNo: 'DST-20260713-001', userId: 'user-demo', merchantId: 'merchant-demo-shop',
        lines: [{ productId: 'product-tasting', productName: '45天发酵酸茶体验装', image: '/images/product-tasting.jpg', quantity: 1, unitPriceCents: 5900 }],
        totalCents: 5900, status: 'SHIPPED', contact: { recipient: '体验用户', phone: '13800138000', address: '云南省德宏州芒市酸茶路 1 号' },
        timeline: [
          { status: 'PENDING_PAYMENT', label: '订单已创建', at: seedTimestamp },
          { status: 'PAID', label: '支付成功', at: seedTimestamp },
          { status: 'SHIPPED', label: '商家已发货', at: seedTimestamp },
        ], createdAt: seedTimestamp,
      },
      {
        id: 'order-after-sale', orderNo: 'DST-20260713-002', userId: 'user-demo', merchantId: 'merchant-demo-shop',
        lines: [{ productId: 'product-gift', productName: '德昂古树酸茶礼盒', image: '/images/product-gift.jpg', quantity: 1, unitPriceCents: 16800 }],
        totalCents: 16800, status: 'AFTER_SALE_REQUESTED', contact: { recipient: '体验用户', phone: '13800138000', address: '云南省德宏州芒市酸茶路 1 号' },
        timeline: [
          { status: 'PENDING_PAYMENT', label: '订单已创建', at: seedTimestamp },
          { status: 'PAID', label: '支付成功', at: seedTimestamp },
          { status: 'AFTER_SALE_REQUESTED', label: '已申请售后', at: seedTimestamp, note: '礼盒外包装破损' },
        ], createdAt: seedTimestamp,
      },
    ],
    afterSales: [{ id: 'after-sale-requested', orderId: 'order-after-sale', userId: 'user-demo', merchantId: 'merchant-demo-shop', reason: '礼盒外包装破损', status: 'REQUESTED', timeline: [{ status: 'REQUESTED', label: '售后申请已提交', at: seedTimestamp }] }],
    bookings: [{ id: 'booking-pending', userId: 'user-demo', date: '2026-08-01', people: 2, phone: '13800138000', code: 'BOOK-DEMO-01', status: 'PENDING', createdAt: seedTimestamp }],
    merchantApplications: [{ id: 'merchant-application-pending', userId: 'user-demo', shopName: '山野酸茶小铺', contact: '13800138000', location: '云南省德宏州芒市', introduction: '专注德昂族酸茶文化体验。', status: 'PENDING', createdAt: seedTimestamp }],
  }
}
