import { defineStore } from 'pinia'
import type {
  Actor,
  Booking,
  ContentArticle,
  ContentInput,
  DashboardMetrics,
  MerchantApplication,
  Order,
  Product,
  ProductStatus,
  ReviewDecision,
} from '../domain/types'
import { useAppStore } from './app'
import { useAuthStore } from './auth'

const emptyMetrics = (): DashboardMetrics => ({ revenueCents: 0, orderCount: 0, productCount: 0, bookingCount: 0, afterSaleCount: 0 })
const productStatuses: ProductStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'OFF_SHELF']

function ownsAdminState(auth: ReturnType<typeof useAuthStore>, actor: Actor, epoch: number, currentEpoch: number): boolean {
  return currentEpoch === epoch && auth.actor?.userId === actor.userId && auth.actor.role === 'ADMIN'
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    metrics: emptyMetrics(),
    orders: [] as Order[],
    merchantApplications: [] as MerchantApplication[],
    products: [] as Product[],
    contents: [] as ContentArticle[],
    bookings: [] as Booking[],
    verifiedBooking: null as Booking | null,
    loading: false,
    pendingOperations: 0,
    error: null as string | null,
    feedback: null as string | null,
    actorEpoch: 0,
    loadSequence: 0,
  }),
  getters: {
    productStatusCounts: (state): Record<ProductStatus, number> => Object.fromEntries(
      productStatuses.map((status) => [status, state.products.filter((product) => product.status === status).length]),
    ) as Record<ProductStatus, number>,
    orderTrend: (state): Array<{ date: string; count: number }> => {
      const counts = new Map<string, number>()
      for (const order of state.orders) {
        const date = order.createdAt.slice(0, 10)
        counts.set(date, (counts.get(date) ?? 0) + 1)
      }
      return [...counts].sort(([left], [right]) => left.localeCompare(right)).map(([date, count]) => ({ date, count }))
    },
  },
  actions: {
    resetForActorChange() {
      this.metrics = emptyMetrics()
      this.orders = []
      this.merchantApplications = []
      this.products = []
      this.contents = []
      this.bookings = []
      this.verifiedBooking = null
      this.loading = false
      this.pendingOperations = 0
      this.error = null
      this.feedback = null
      this.actorEpoch += 1
      this.loadSequence += 1
    },
    requireAdminActor(): Actor {
      const auth = useAuthStore()
      if (auth.actor === null || auth.user?.role !== 'ADMIN') throw new Error('仅管理员可以执行此操作')
      return auth.actor
    },
    async loadDashboard(): Promise<void> {
      const actor = this.requireAdminActor()
      await this.runLoad(actor, async () => {
        const [metrics, orders, products] = await Promise.all([
          useAppStore().repository.dashboard(actor),
          useAppStore().repository.listOrders(actor),
          useAppStore().repository.listAdminProducts(actor),
        ])
        return { metrics, orders, products }
      }, ({ metrics, orders, products }) => {
        this.metrics = metrics
        this.orders = orders
        this.products = products
      })
    },
    async loadMerchants(): Promise<MerchantApplication[]> {
      const actor = this.requireAdminActor()
      return this.runLoad(actor, () => useAppStore().repository.listMerchantApplications(actor), (items) => { this.merchantApplications = items })
    },
    async loadProducts(): Promise<Product[]> {
      const actor = this.requireAdminActor()
      return this.runLoad(actor, () => useAppStore().repository.listAdminProducts(actor), (items) => { this.products = items })
    },
    async loadContents(): Promise<ContentArticle[]> {
      const actor = this.requireAdminActor()
      return this.runLoad(actor, () => useAppStore().repository.listAdminContents(actor), (items) => { this.contents = items })
    },
    async loadBookings(): Promise<Booking[]> {
      const actor = this.requireAdminActor()
      return this.runLoad(actor, () => useAppStore().repository.listBookings(actor), (items) => { this.bookings = items })
    },
    async reviewMerchant(applicationId: string, decision: ReviewDecision): Promise<MerchantApplication> {
      const actor = this.requireAdminActor()
      return this.runMutation(actor, () => useAppStore().repository.reviewMerchant(actor, applicationId, decision), (application) => {
        const index = this.merchantApplications.findIndex(({ id }) => id === application.id)
        if (index !== -1) this.merchantApplications[index] = application
        this.feedback = decision.result === 'APPROVE' ? '商家申请已通过' : '商家申请已驳回'
      })
    },
    async reviewProduct(productId: string, decision: ReviewDecision): Promise<Product> {
      const actor = this.requireAdminActor()
      return this.runMutation(actor, () => useAppStore().repository.reviewProduct(actor, productId, decision), (product) => {
        const index = this.products.findIndex(({ id }) => id === product.id)
        if (index !== -1) this.products[index] = product
        this.feedback = decision.result === 'APPROVE' ? '商品审核已通过' : '商品审核已驳回'
      })
    },
    async saveContent(input: ContentInput): Promise<ContentArticle> {
      const actor = this.requireAdminActor()
      return this.runMutation(actor, () => useAppStore().repository.saveContent(actor, input), (content) => {
        const index = this.contents.findIndex(({ id }) => id === content.id)
        if (index === -1) this.contents.unshift(content)
        else this.contents[index] = content
        this.feedback = content.published ? '内容已保存并发布' : '内容草稿已保存'
      })
    },
    async verifyBooking(code: string): Promise<Booking> {
      const actor = this.requireAdminActor()
      return this.runMutation(actor, () => useAppStore().repository.verifyBooking(actor, code), (booking) => {
        const index = this.bookings.findIndex(({ id }) => id === booking.id)
        if (index === -1) this.bookings.unshift(booking)
        else this.bookings[index] = booking
        this.verifiedBooking = booking
        this.feedback = `核销成功：${booking.code}`
      })
    },
    async runLoad<Result>(actor: Actor, operation: () => Promise<Result>, commit: (result: Result) => void): Promise<Result> {
      const auth = useAuthStore()
      const epoch = this.actorEpoch
      const sequence = ++this.loadSequence
      const ownsState = () => ownsAdminState(auth, actor, epoch, this.actorEpoch) && this.loadSequence === sequence
      this.loading = true
      this.error = null
      try {
        const result = await operation()
        if (!ownsState()) throw new Error('登录账号已切换，请重新加载管理数据')
        commit(result)
        return result
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '管理数据加载失败'
        throw error
      } finally {
        if (ownsState()) this.loading = false
      }
    },
    async runMutation<Result>(actor: Actor, operation: () => Promise<Result>, commit: (result: Result) => void): Promise<Result> {
      const auth = useAuthStore()
      const epoch = this.actorEpoch
      const ownsState = () => ownsAdminState(auth, actor, epoch, this.actorEpoch)
      this.pendingOperations += 1
      this.error = null
      this.feedback = null
      try {
        const result = await operation()
        if (!ownsState()) throw new Error('登录账号已切换，请重新执行管理操作')
        commit(result)
        return result
      } catch (error) {
        if (ownsState()) this.error = error instanceof Error ? error.message : '管理操作失败'
        throw error
      } finally {
        if (ownsState()) this.pendingOperations = Math.max(0, this.pendingOperations - 1)
      }
    },
  },
})
