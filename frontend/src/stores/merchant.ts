import { defineStore } from "pinia";
import type {
  Actor,
  AfterSale,
  MerchantApplication,
  MerchantApplicationInput,
  Order,
  Product,
  ProductDraftInput,
  ProductStatus,
} from "../domain/types";
import { useAppStore } from "./app";
import { useAuthStore } from "./auth";

const productStatuses: ProductStatus[] = [
  "DRAFT",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "OFF_SHELF",
];

function actorStillOwnsState(
  auth: ReturnType<typeof useAuthStore>,
  actor: Actor,
  epoch: number,
  currentEpoch: number,
): boolean {
  return (
    currentEpoch === epoch &&
    auth.actor?.userId === actor.userId &&
    auth.actor.role === actor.role &&
    auth.actor.merchantId === actor.merchantId
  );
}

export const useMerchantStore = defineStore("merchant", {
  state: () => ({
    application: null as MerchantApplication | null,
    products: [] as Product[],
    orders: [] as Order[],
    afterSales: [] as AfterSale[],
    loading: false,
    pendingOperations: 0,
    error: null as string | null,
    actorEpoch: 0,
    loadSequence: 0,
  }),
  getters: {
    productStatusCounts: (state): Record<ProductStatus, number> =>
      Object.fromEntries(
        productStatuses.map((status) => [
          status,
          state.products.filter((product) => product.status === status).length,
        ]),
      ) as Record<ProductStatus, number>,
    metrics: (state) => ({
      revenueCents: state.orders
        .filter(
          (order) =>
            order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED",
        )
        .reduce((total, order) => total + order.totalCents, 0),
      orderCount: state.orders.length,
      paidOrderCount: state.orders.filter((order) => order.status === "PAID")
        .length,
      pendingShipmentCount: state.orders.filter(
        (order) => order.status === "PAID",
      ).length,
      productCount: state.products.length,
      afterSaleCount: state.afterSales.filter(
        (item) => !["REJECTED", "REFUNDED", "CLOSED"].includes(item.status),
      ).length,
    }),
  },
  actions: {
    resetForActorChange() {
      this.application = null;
      this.products = [];
      this.orders = [];
      this.afterSales = [];
      this.loading = false;
      this.pendingOperations = 0;
      this.error = null;
      this.actorEpoch += 1;
      this.loadSequence += 1;
    },
    async loadApplication(): Promise<MerchantApplication | null> {
      const auth = useAuthStore();
      if (
        auth.actor === null ||
        !["USER", "MERCHANT"].includes(auth.user?.role ?? "")
      )
        throw new Error("无权查看商家申请");
      const actor = auth.actor;
      const epoch = this.actorEpoch;
      const sequence = ++this.loadSequence;
      const ownsState = () =>
        actorStillOwnsState(auth, actor, epoch, this.actorEpoch) &&
        this.loadSequence === sequence;
      this.loading = true;
      this.error = null;
      try {
        const application =
          await useAppStore().repository.getMerchantApplication(actor.userId);
        if (!ownsState()) throw new Error("登录账号已切换，请重新加载申请");
        this.application = application;
        return application;
      } catch (error) {
        if (ownsState())
          this.error = error instanceof Error ? error.message : "申请加载失败";
        throw error;
      } finally {
        if (ownsState()) this.loading = false;
      }
    },
    async apply(input: MerchantApplicationInput): Promise<MerchantApplication> {
      const auth = useAuthStore();
      if (auth.actor === null || auth.user?.role !== "USER")
        throw new Error("仅普通用户可以申请入驻");
      const actor = auth.actor;
      return this.runMutation(
        actor,
        () => useAppStore().repository.applyMerchant(actor, input),
        (application) => {
          this.application = application;
          if (auth.user?.id === actor.userId)
            auth.user = { ...auth.user, merchantStatus: "PENDING" };
        },
      );
    },
    async loadWorkspace(): Promise<void> {
      const auth = useAuthStore();
      if (
        auth.actor === null ||
        auth.user?.role !== "MERCHANT" ||
        auth.user.merchantStatus !== "APPROVED"
      )
        throw new Error("商家身份尚未通过审核");
      const actor = auth.actor;
      const epoch = this.actorEpoch;
      const sequence = ++this.loadSequence;
      const ownsState = () =>
        actorStillOwnsState(auth, actor, epoch, this.actorEpoch) &&
        this.loadSequence === sequence;
      this.loading = true;
      this.error = null;
      try {
        const [products, orders, afterSales] = await Promise.all([
          useAppStore().repository.listMerchantProducts(actor),
          useAppStore().repository.listOrders(actor),
          useAppStore().repository.listAfterSales(actor),
        ]);
        if (!ownsState()) throw new Error("登录账号已切换，请重新加载商家中心");
        this.products = products;
        this.orders = orders;
        this.afterSales = afterSales;
      } catch (error) {
        if (ownsState())
          this.error =
            error instanceof Error ? error.message : "商家中心加载失败";
        throw error;
      } finally {
        if (ownsState()) this.loading = false;
      }
    },
    async saveProduct(input: ProductDraftInput): Promise<Product> {
      const actor = this.requireMerchantActor();
      return this.runMutation(
        actor,
        () => useAppStore().repository.saveProduct(actor, input),
        (product) => this.rememberProduct(product),
      );
    },
    async submitProduct(productId: string): Promise<Product> {
      const actor = this.requireMerchantActor();
      return this.runMutation(
        actor,
        () => useAppStore().repository.submitProduct(actor, productId),
        (product) => this.rememberProduct(product),
      );
    },
    async shipOrder(orderId: string): Promise<Order> {
      const actor = this.requireMerchantActor();
      return this.runMutation(
        actor,
        () => useAppStore().repository.shipOrder(actor, orderId),
        (order) => this.rememberOrder(order),
      );
    },
    async resolveAfterSale(
      afterSaleId: string,
      decision: "APPROVE" | "REJECT",
      note: string,
    ): Promise<AfterSale> {
      const actor = this.requireMerchantActor();
      return this.runMutation(
        actor,
        () =>
          useAppStore().repository.resolveAfterSale(
            actor,
            afterSaleId,
            decision,
            note,
          ),
        (item) => this.rememberAfterSale(item),
      );
    },
    async refundAfterSale(
      afterSaleId: string,
      note: string,
    ): Promise<AfterSale> {
      const actor = this.requireMerchantActor();
      return this.runMutation(
        actor,
        () =>
          useAppStore().repository.refundAfterSale(actor, afterSaleId, note),
        (item) => this.rememberAfterSale(item),
      );
    },
    requireMerchantActor(): Actor {
      const auth = useAuthStore();
      if (
        auth.actor === null ||
        auth.user?.role !== "MERCHANT" ||
        auth.user.merchantStatus !== "APPROVED"
      )
        throw new Error("无权操作商家数据");
      return auth.actor;
    },
    rememberProduct(product: Product) {
      const index = this.products.findIndex(({ id }) => id === product.id);
      if (index === -1) this.products.unshift(product);
      else this.products[index] = product;
    },
    rememberOrder(order: Order) {
      const index = this.orders.findIndex(({ id }) => id === order.id);
      if (index === -1) this.orders.unshift(order);
      else this.orders[index] = order;
    },
    rememberAfterSale(item: AfterSale) {
      const index = this.afterSales.findIndex(({ id }) => id === item.id);
      if (index === -1) this.afterSales.unshift(item);
      else this.afterSales[index] = item;
    },
    async runMutation<Result>(
      actor: Actor,
      operation: () => Promise<Result>,
      commit: (result: Result) => void,
    ): Promise<Result> {
      const auth = useAuthStore();
      const epoch = this.actorEpoch;
      const ownsState = () =>
        actorStillOwnsState(auth, actor, epoch, this.actorEpoch);
      this.pendingOperations += 1;
      this.error = null;
      try {
        const result = await operation();
        if (!ownsState()) throw new Error("登录账号已切换，请重新执行操作");
        commit(result);
        return result;
      } catch (error) {
        if (ownsState())
          this.error = error instanceof Error ? error.message : "商家操作失败";
        throw error;
      } finally {
        if (ownsState())
          this.pendingOperations = Math.max(0, this.pendingOperations - 1);
      }
    },
  },
});
