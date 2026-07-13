<script setup lang="ts">
import { PackageCheck, PackageOpen } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";
import FilterBar from "../../components/workspace/FilterBar.vue";
import type { OrderStatus } from "../../domain/types";
import { useMerchantStore } from "../../stores/merchant";
import { formatMoney } from "../../utils/money";

const merchant = useMerchantStore();
const keyword = ref("");
const status = ref("ALL");
const page = ref(1);
const pageSize = 8;
const feedback = ref<string | null>(null);
const processingId = ref<string | null>(null);
const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "待支付",
  PAID: "待发货",
  SHIPPED: "已发货",
  RECEIVED: "已收货",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};
const statusOptions = [
  { label: "全部状态", value: "ALL" },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];
const filteredOrders = computed(() =>
  merchant.orders.filter((order) => {
    const haystack =
      `${order.orderNo}${order.contact.recipient}${order.contact.phone}${order.lines.map(({ productName }) => productName).join("")}`.toLowerCase();
    return (
      haystack.includes(keyword.value.trim().toLowerCase()) &&
      (status.value === "ALL" || order.status === status.value)
    );
  }),
);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredOrders.value.length / pageSize)),
);
const pagedOrders = computed(() =>
  filteredOrders.value.slice(
    (page.value - 1) * pageSize,
    page.value * pageSize,
  ),
);

watch([keyword, status], () => {
  page.value = 1;
});
onMounted(() => {
  if (merchant.orders.length === 0)
    void merchant.loadWorkspace().catch(() => undefined);
});

async function ship(orderId: string) {
  feedback.value = null;
  processingId.value = orderId;
  try {
    await merchant.shipOrder(orderId);
    feedback.value = "订单已标记为发货，用户端状态已同步";
  } catch {
    // Store error is rendered below.
  } finally {
    processingId.value = null;
  }
}
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          订单履约
        </p>
        <h1>订单发货</h1>
        <p>仅已完成模拟支付的订单可以发货，发货操作不可重复。</p>
      </div>
      <span class="workspace-count">{{ merchant.metrics.pendingShipmentCount }} 笔待发货</span>
    </header>

    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索订单号、收件人或商品"
    />
    <p
      v-if="feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ feedback }}
    </p>
    <p
      v-if="merchant.error"
      class="workspace-alert"
      role="alert"
    >
      {{ merchant.error }}
    </p>

    <section
      v-if="merchant.loading && merchant.orders.length === 0"
      class="workspace-state"
    >
      正在加载订单…
    </section>
    <section
      v-else-if="pagedOrders.length === 0"
      class="workspace-empty"
    >
      <PackageOpen :size="28" />
      <h2>没有符合条件的订单</h2>
      <p>新订单完成模拟支付后会出现在待发货列表。</p>
    </section>
    <template v-else>
      <div class="workspace-table-wrap">
        <table class="workspace-table workspace-order-table">
          <thead>
            <tr>
              <th>订单</th>
              <th>收件信息</th>
              <th>金额</th>
              <th>状态</th>
              <th>下单时间</th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="order in pagedOrders"
              :key="order.id"
            >
              <td>
                <div class="workspace-order-cell">
                  <strong>{{ order.orderNo }}</strong><span>{{ order.lines[0]?.productName
                  }}<template v-if="order.lines.length > 1">
                    等 {{ order.lines.length }} 种</template></span>
                </div>
              </td>
              <td>
                <div class="workspace-order-cell">
                  <strong>{{ order.contact.recipient }}</strong><span>{{ order.contact.phone }}</span><small>{{ order.contact.address }}</small>
                </div>
              </td>
              <td>
                <strong>{{ formatMoney(order.totalCents) }}</strong>
              </td>
              <td>
                <span
                  :class="[
                    'workspace-status',
                    `workspace-status--${order.status.toLowerCase()}`,
                  ]"
                >{{ statusLabels[order.status] }}</span>
              </td>
              <td>
                {{ new Date(order.createdAt).toLocaleDateString("zh-CN") }}
              </td>
              <td>
                <button
                  v-if="order.status === 'PAID'"
                  class="workspace-button workspace-button--primary workspace-button--compact"
                  type="button"
                  :disabled="processingId !== null"
                  @click="ship(order.id)"
                >
                  <PackageCheck :size="17" />{{
                    processingId === order.id ? "发货中…" : "确认发货"
                  }}
                </button><span
                  v-else
                  class="workspace-row-muted"
                >{{
                  order.status === "PENDING_PAYMENT" ? "等待支付" : "无需操作"
                }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="workspace-mobile-list">
        <article
          v-for="order in pagedOrders"
          :key="order.id"
          class="workspace-mobile-item workspace-mobile-item--order"
        >
          <div>
            <span
              :class="[
                'workspace-status',
                `workspace-status--${order.status.toLowerCase()}`,
              ]"
            >{{ statusLabels[order.status] }}</span>
            <h2>{{ order.orderNo }}</h2>
            <p>{{ order.contact.recipient }} · {{ order.contact.phone }}</p>
            <small>{{ order.lines[0]?.productName }}</small>
          </div>
          <strong>{{ formatMoney(order.totalCents) }}</strong>
          <button
            v-if="order.status === 'PAID'"
            class="workspace-button workspace-button--primary"
            type="button"
            :disabled="processingId !== null"
            @click="ship(order.id)"
          >
            <PackageCheck :size="17" />确认发货
          </button>
        </article>
      </div>

      <nav
        class="workspace-pagination"
        aria-label="订单分页"
      >
        <button
          type="button"
          :disabled="page <= 1"
          @click="page -= 1"
        >
          上一页
        </button><span>第 {{ page }} / {{ pageCount }} 页</span><button
          type="button"
          :disabled="page >= pageCount"
          @click="page += 1"
        >
          下一页
        </button>
      </nav>
    </template>
  </article>
</template>
