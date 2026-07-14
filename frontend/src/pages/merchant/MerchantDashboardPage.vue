<script setup lang="ts">
import {
  Boxes,
  CircleDollarSign,
  FileHeart,
  PackageCheck,
  ShoppingBag,
} from "lucide-vue-next";
import { computed, onMounted } from "vue";
import MetricStrip from "../../components/workspace/MetricStrip.vue";
import type { ProductStatus } from "../../domain/types";
import { useMerchantStore } from "../../stores/merchant";
import { formatMoney } from "../../utils/money";

const merchant = useMerchantStore();
const statusLabels: Record<ProductStatus, string> = {
  DRAFT: "草稿",
  PENDING: "待审核",
  APPROVED: "已上架",
  REJECTED: "已驳回",
  OFF_SHELF: "已下架",
};

const metricItems = computed(() => [
  {
    label: "累计成交",
    value: formatMoney(merchant.metrics.revenueCents),
    detail: "模拟交易口径",
    icon: CircleDollarSign,
  },
  {
    label: "商家订单",
    value: merchant.metrics.orderCount,
    detail: `${merchant.metrics.pendingShipmentCount} 笔待发货`,
    icon: ShoppingBag,
  },
  {
    label: "商品总数",
    value: merchant.metrics.productCount,
    detail: `${merchant.productStatusCounts.APPROVED} 件已上架`,
    icon: Boxes,
  },
  {
    label: "待发货",
    value: merchant.metrics.pendingShipmentCount,
    detail: "仅已支付订单",
    icon: PackageCheck,
  },
  {
    label: "处理中售后",
    value: merchant.metrics.afterSaleCount,
    detail: "需及时响应",
    icon: FileHeart,
  },
]);

const recentOrders = computed(() => [...merchant.orders].slice(0, 5));
const maxStatusCount = computed(() =>
  Math.max(1, ...Object.values(merchant.productStatusCounts)),
);

onMounted(() => {
  void merchant.loadWorkspace().catch(() => undefined);
});
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          经营概览
        </p>
        <h1>商家工作台</h1>
        <p>查看当前店铺的商品、订单与售后状态。</p>
      </div>
      <RouterLink
        class="workspace-button workspace-button--primary"
        to="/merchant/products/new"
      >
        新增商品
      </RouterLink>
    </header>

    <section
      v-if="merchant.loading && merchant.products.length === 0"
      class="workspace-state"
    >
      <p>正在汇总经营数据…</p>
    </section>
    <section
      v-else-if="merchant.error && merchant.products.length === 0"
      class="workspace-state workspace-state--error"
    >
      <p>{{ merchant.error }}</p>
      <button
        class="workspace-button"
        type="button"
        @click="merchant.loadWorkspace"
      >
        重新加载
      </button>
    </section>
    <template v-else>
      <MetricStrip :items="metricItems" />

      <div class="workspace-dashboard-grid">
        <section class="workspace-section">
          <div class="workspace-section__heading">
            <div>
              <p class="workspace-eyebrow">
                商品状态
              </p>
              <h2>上架进度分布</h2>
            </div>
            <RouterLink to="/merchant/products">
              查看全部
            </RouterLink>
          </div>
          <ul class="status-distribution">
            <li
              v-for="(count, status) in merchant.productStatusCounts"
              :key="status"
            >
              <span>{{ statusLabels[status] }}</span>
              <div>
                <i
                  :style="{
                    width: `${Math.max(4, (count / maxStatusCount) * 100)}%`,
                  }"
                />
              </div>
              <strong>{{ count }}</strong>
            </li>
          </ul>
        </section>

        <section class="workspace-section">
          <div class="workspace-section__heading">
            <div>
              <p class="workspace-eyebrow">
                订单动态
              </p>
              <h2>最近订单</h2>
            </div>
            <RouterLink to="/merchant/orders">
              处理订单
            </RouterLink>
          </div>
          <div
            v-if="recentOrders.length === 0"
            class="workspace-empty workspace-empty--compact"
          >
            暂无订单
          </div>
          <ul
            v-else
            class="recent-order-list"
          >
            <li
              v-for="order in recentOrders"
              :key="order.id"
            >
              <div>
                <strong>{{ order.orderNo }}</strong><span>{{ order.contact.recipient }} ·
                  {{ order.lines.length }} 种商品</span>
              </div>
              <div>
                <b>{{ formatMoney(order.totalCents) }}</b><span class="workspace-status">{{
                  order.status === "PAID"
                    ? "待发货"
                    : order.status === "SHIPPED"
                      ? "已发货"
                      : order.status
                }}</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </article>
</template>
