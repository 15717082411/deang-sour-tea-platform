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

export const DEMO_STORAGE_KEY = 'deang-sour-tea:v5'
export const DEMO_DATA_VERSION = 5
export const LEGACY_DEMO_STORAGE_KEY = 'deang-sour-tea:v4'
export const V3_DEMO_STORAGE_KEY = 'deang-sour-tea:v3'

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
      { id: 'product-tasting', merchantId: 'merchant-demo-shop', merchantName: '酸茶工坊', name: '45天发酵酸茶体验装', category: '体验装', priceCents: 5900, stock: 80, sales: 1, description: '微酸回甘的入门体验装。', image: '/images/product-tasting.webp', status: 'APPROVED' },
      { id: 'product-gift', merchantId: 'merchant-demo-shop', merchantName: '酸茶工坊', name: '德昂古树酸茶礼盒', category: '酸茶礼盒', priceCents: 16800, stock: 36, sales: 1, description: '适合馈赠的古树酸茶礼盒。', image: '/images/product-gift.webp', status: 'APPROVED' },
      { id: 'product-pending', merchantId: 'merchant-demo-shop', merchantName: '酸茶工坊', name: '三味酸茶品鉴套装', category: '体验装', priceCents: 8900, stock: 60, sales: 0, description: '三种发酵阶段的酸茶小样，等待平台审核。', image: '/images/product-tasting.webp', status: 'PENDING' },
    ],
    contents: [
      {
        id: 'content-about',
        slug: 'what-is-sour-tea',
        title: '德昂族酸茶是什么',
        category: '酸茶科普',
        summary: '从国家级非遗名录与公开资料认识德昂族酸茶的制作、食用和饮用方式。',
        body: '德昂族酸茶制作技艺项目编号为VIII-268，于2021年列入第五批国家级非物质文化遗产代表性项目名录，主要分布于云南省德宏傣族景颇族自治州芒市，保护单位为芒市文化馆。\n\n公开材料记录的原料为大叶种鲜叶。制作过程包括热处理、揉捻、厌氧发酵、舂捣、成形和干燥等环节；成品可分为食用的湿茶与冲泡的干茶。\n\n德昂族酸茶是本专题的唯一文化对象。页面中的项目原创视觉用于解释手艺场景，不作为历史档案或具体人物身份的证明。',
        cover: '/images/hero-sour-tea.webp',
        sources: [
          {
            title: '德昂族酸茶制作技艺',
            publisher: '中国非物质文化遗产网·中国非物质文化遗产数字博物馆',
            url: 'https://www.ihchina.cn/project_details/23582/',
            claim: '项目编号VIII-268；2021年列入第五批国家级非物质文化遗产代表性项目名录；主要分布于德宏州芒市，保护单位为芒市文化馆；以大叶种茶为原料，记录热处理、揉捻、厌氧发酵、舂捣、成形和干燥等环节；湿茶用于食用，干茶用于冲泡，二者发酵时长存在差异。',
          },
          {
            title: 'Traditional tea processing techniques and associated social practices in China',
            publisher: 'UNESCO Intangible Cultural Heritage',
            url: 'https://ich.unesco.org/en/RL/traditional-tea-processing-techniques-and-associated-social-practices-in-china-01884?RL=01884',
            claim: '中国传统制茶技艺及其相关习俗于2022年列入人类非物质文化遗产代表作名录；相关知识与实践涵盖茶园管理、采摘、手工加工、饮用与分享，并通过家庭和师徒方式传承。',
          },
          {
            title: '德宏州德昂酸茶高质量发展三年行动计划（2025—2027年）',
            publisher: '德宏州人民政府办公室',
            url: 'https://www.dh.gov.cn/Web/_F0_0_67EWL4TR8A9F3B4052C940E6BE.htm',
            claim: '地方公开行动计划提出代表性传承人培养、工坊与培训、公众体验点建设和非遗宣传推广等工作。',
          },
        ],
        published: true,
      },
      {
        id: 'content-craft',
        slug: 'fermentation-craft',
        title: '从鲜叶到酸茶：工艺与时间',
        category: '制作技艺',
        summary: '沿着摊放、蒸制、揉捻、密封发酵与湿食或干制的路径，理解不同用途对应的时间差异。',
        body: '云南省农业农村厅公开材料记录了一条具体工艺路径：鲜叶在避开阳光直射的竹席或竹盘中摊放，随后洗叶、蒸制、冷却和揉捻，再装入竹筒或竹篮，密封捆扎后置于坑或地窖中发酵50—70天。\n\n发酵周期不能被写成唯一固定值。国家级非遗项目资料同时记录，食用湿茶发酵约2个月；用于冲泡的干茶需要经过更长时间发酵，再舂制、成形和干燥。材料所述工艺、用途与时间口径不同，应并列理解。\n\n这些公开记录说明的是制作技艺与食用方式，不构成医疗、保健或疾病治疗建议。',
        cover: '/images/craft-fermentation.webp',
        sources: [
          {
            title: '德昂族酸茶制作技艺',
            publisher: '云南省农业农村厅',
            url: 'https://nync.yn.gov.cn/html/2025/yzycfycj_0407/1418142.html',
            claim: '鲜叶避开阳光直射在竹席或竹盘中摊放；经洗叶、蒸制、冷却、揉捻后装入竹筒或竹篮并密封捆扎；坑或地窖发酵记录为50—70天；成品可湿食，也可干制后冲泡。',
          },
          {
            title: '德昂族酸茶制作技艺',
            publisher: '中国非物质文化遗产网·中国非物质文化遗产数字博物馆',
            url: 'https://www.ihchina.cn/project_details/23582/',
            claim: '公开资料区分食用湿茶与饮用干茶：食用湿茶约发酵2个月，饮用干茶发酵时间更长，之后还需舂制、成形和干燥。',
          },
        ],
        published: true,
      },
    ],
    carts: {},
    orders: [
      {
        id: 'order-shipped', orderNo: 'DST-20260713-001', userId: 'user-demo', merchantId: 'merchant-demo-shop',
        lines: [{ productId: 'product-tasting', productName: '45天发酵酸茶体验装', image: '/images/product-tasting.webp', quantity: 1, unitPriceCents: 5900 }],
        totalCents: 5900, status: 'SHIPPED', contact: { recipient: '体验用户', phone: '13800138000', address: '云南省德宏州芒市酸茶路 1 号' },
        timeline: [
          { status: 'PENDING_PAYMENT', label: '订单已创建', at: seedTimestamp },
          { status: 'PAID', label: '支付成功', at: seedTimestamp },
          { status: 'SHIPPED', label: '商家已发货', at: seedTimestamp },
        ], createdAt: seedTimestamp,
      },
      {
        id: 'order-after-sale', orderNo: 'DST-20260713-002', userId: 'user-demo', merchantId: 'merchant-demo-shop',
        lines: [{ productId: 'product-gift', productName: '德昂古树酸茶礼盒', image: '/images/product-gift.webp', quantity: 1, unitPriceCents: 16800 }],
        totalCents: 16800, status: 'PAID', contact: { recipient: '体验用户', phone: '13800138000', address: '云南省德宏州芒市酸茶路 1 号' },
        timeline: [
          { status: 'PENDING_PAYMENT', label: '订单已创建', at: seedTimestamp },
          { status: 'PAID', label: '支付成功', at: seedTimestamp },
          { status: 'AFTER_SALE_REQUESTED', label: '已申请售后', at: seedTimestamp, note: '礼盒外包装破损' },
        ], createdAt: seedTimestamp,
      },
    ],
    afterSales: [{ id: 'after-sale-requested', orderId: 'order-after-sale', userId: 'user-demo', merchantId: 'merchant-demo-shop', reason: '礼盒外包装破损', status: 'REQUESTED', timeline: [{ status: 'REQUESTED', label: '售后申请已提交', at: seedTimestamp }] }],
    bookings: [{
      id: 'booking-pending',
      userId: 'user-demo',
      date: '2027-06-01',
      people: 2,
      phone: '13800138000',
      code: 'BOOK-DEMO-01',
      status: 'PENDING',
      timeline: [{ status: 'PENDING', label: '预约已提交', at: seedTimestamp }],
      createdAt: seedTimestamp,
    }],
    merchantApplications: [{ id: 'merchant-application-pending', userId: 'user-demo', shopName: '山野酸茶小铺', contact: '13800138000', location: '云南省德宏州芒市', introduction: '专注德昂族酸茶文化体验。', status: 'PENDING', agreementAcceptedAt: seedTimestamp, createdAt: seedTimestamp }],
  }
}

const v3BuiltInContents: ContentArticle[] = [
  {
    id: 'content-about',
    slug: 'what-is-sour-tea',
    title: '德昂族酸茶是什么',
    category: '酸茶科普',
    summary: '介绍酸茶的来源与风味。',
    body: '德昂族酸茶是围绕古法制茶经验形成的非遗体验核心内容。',
    cover: '/images/content-about.jpg',
    sources: [],
    published: true,
  },
  {
    id: 'content-craft',
    slug: 'fermentation-craft',
    title: '杀青、揉捻与45天发酵',
    category: '制作技艺',
    summary: '把手工经验拆解为三步。',
    body: '平台将杀青、揉捻和发酵拆解为互动与线下工坊体验。',
    cover: '/images/content-craft.jpg',
    sources: [],
    published: true,
  },
]
const contentArticleFields = [
  'id',
  'slug',
  'title',
  'category',
  'summary',
  'body',
  'cover',
  'sources',
  'published',
] as const satisfies readonly (keyof ContentArticle)[]
const contentSeedIds = new Set(v3BuiltInContents.map(({ id }) => id))
const builtInImageMigrations: Record<string, { from: string; to: string }> = {
  'product-tasting': { from: '/images/product-tasting.jpg', to: '/images/product-tasting.webp' },
  'product-gift': { from: '/images/product-gift.jpg', to: '/images/product-gift.webp' },
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => isDeepEqual(value, right[index]))
  }
  if (!isRecord(left) || !isRecord(right)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && isDeepEqual(left[key], right[key]))
}

function migrateBuiltInContent(
  content: ContentArticle,
  v3Content: ContentArticle,
  currentContent: ContentArticle,
): ContentArticle {
  const migrated = { ...content }
  const mutableMigrated = migrated as unknown as Record<string, unknown>
  for (const field of contentArticleFields) {
    if (isDeepEqual(content[field], v3Content[field])) {
      mutableMigrated[field] = structuredClone(currentContent[field])
    }
  }
  return migrated
}

export function migrateDemoDataV3(legacyData: DemoData): DemoData {
  const migrated = JSON.parse(JSON.stringify(legacyData)) as DemoData
  const currentContents = createSeedData().contents.filter(({ id }) => contentSeedIds.has(id))
  const currentContentById = new Map(currentContents.map((content) => [content.id, content]))
  const v3ContentById = new Map(v3BuiltInContents.map((content) => [content.id, content]))
  const migratedContentIds = new Set<string>()

  migrated.contents = migrated.contents.flatMap((content) => {
    if (!contentSeedIds.has(content.id)) return [content]
    if (migratedContentIds.has(content.id)) return []
    migratedContentIds.add(content.id)
    const v3Content = v3ContentById.get(content.id)
    const currentContent = currentContentById.get(content.id)
    return v3Content !== undefined && currentContent !== undefined
      ? [migrateBuiltInContent(content, v3Content, currentContent)]
      : [content]
  })
  for (const content of currentContents) {
    if (!migrated.contents.some(({ id }) => id === content.id)) migrated.contents.push(content)
  }

  migrated.products = migrated.products.map((product) => {
    const imageMigration = builtInImageMigrations[product.id]
    return imageMigration !== undefined && product.image === imageMigration.from
      ? { ...product, image: imageMigration.to }
      : product
  })
  migrated.orders = migrated.orders.map((order) => ({
    ...order,
    lines: order.lines.map((line) => {
      const imageMigration = builtInImageMigrations[line.productId]
      return imageMigration !== undefined && line.image === imageMigration.from
        ? { ...line, image: imageMigration.to }
        : line
    }),
  }))

  return migrated
}

const fulfillmentStatuses = new Set<Order['status']>([
  'PENDING_PAYMENT',
  'PAID',
  'SHIPPED',
  'RECEIVED',
  'COMPLETED',
  'CANCELLED',
])

export function migrateDemoDataV4(legacyData: DemoData): DemoData {
  const migrated = JSON.parse(JSON.stringify(legacyData)) as DemoData

  migrated.orders = migrated.orders.map((order) => {
    if ((order.status as string) !== 'AFTER_SALE_REQUESTED') return order
    const previous = [...order.timeline]
      .reverse()
      .map(({ status }) => status)
      .find((status): status is Order['status'] => fulfillmentStatuses.has(status as Order['status']))
    return { ...order, status: previous ?? 'PAID' }
  })

  migrated.bookings = migrated.bookings.map((booking) => {
    if (Array.isArray(booking.timeline) && booking.timeline.length > 0) return booking
    const submittedEvent = {
      status: 'PENDING',
      label: '预约已提交',
      at: booking.createdAt,
    }
    if (booking.status === 'PENDING') return { ...booking, timeline: [submittedEvent] }
    const label = booking.status === 'VERIFIED'
      ? '预约已核销'
      : '预约已取消'
    const knownTerminalTime = booking.status === 'VERIFIED' && booking.verifiedAt !== undefined
    return {
      ...booking,
      timeline: [
        submittedEvent,
        {
          status: booking.status,
          label,
          at: knownTerminalTime ? booking.verifiedAt as string : booking.createdAt,
          ...(knownTerminalTime ? {} : {
            note: '历史记录迁移：终态发生时间未知',
            timeKnown: false,
          }),
        },
      ],
    }
  })

  return migrated
}
