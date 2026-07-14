<script setup lang="ts">
import { Check, FileHeart, RotateCcw, X } from "lucide-vue-next";
import { computed, onMounted, reactive, ref } from "vue";
import FilterBar from "../../components/workspace/FilterBar.vue";
import type { AfterSaleStatus } from "../../domain/types";
import { useMerchantStore } from "../../stores/merchant";
import { formatMoney } from "../../utils/money";

const merchant = useMerchantStore();
const keyword = ref("");
const status = ref("ALL");
const notes = reactive<Record<string, string>>({});
const processingId = ref<string | null>(null);
const feedback = ref<string | null>(null);
const statusLabels: Record<AfterSaleStatus, string> = {
  REQUESTED: "待处理",
  PROCESSING: "处理中",
  APPROVED: "待退款",
  REJECTED: "已拒绝",
  REFUNDED: "已退款",
  CLOSED: "已关闭",
};
const statusOptions = [
  { label: "全部状态", value: "ALL" },
  ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
];
const filteredAfterSales = computed(() =>
  merchant.afterSales.filter((item) => {
    const order = merchant.orders.find(({ id }) => id === item.orderId);
    const haystack =
      `${order?.orderNo ?? item.orderId}${item.reason}${item.resolutionNote ?? ""}`.toLowerCase();
    return (
      haystack.includes(keyword.value.trim().toLowerCase()) &&
      (status.value === "ALL" || item.status === status.value)
    );
  }),
);
const orderFor = (orderId: string) =>
  merchant.orders.find(({ id }) => id === orderId);

onMounted(() => {
  if (merchant.afterSales.length === 0)
    void merchant.loadWorkspace().catch(() => undefined);
});

async function resolve(afterSaleId: string, decision: "APPROVE" | "REJECT") {
  const note = notes[afterSaleId]?.trim() ?? "";
  if (!note) {
    merchant.error = "请先填写处理说明";
    return;
  }
  processingId.value = afterSaleId;
  feedback.value = null;
  try {
    await merchant.resolveAfterSale(afterSaleId, decision, note);
    feedback.value =
      decision === "APPROVE"
        ? "售后已通过，请继续执行模拟退款"
        : "售后已拒绝，处理结果已同步给用户";
  } catch {
    // Store error is rendered below.
  } finally {
    processingId.value = null;
  }
}

async function refund(afterSaleId: string) {
  if (!globalThis.confirm("确认完成本次模拟退款？此操作会更新用户售后状态。"))
    return;
  processingId.value = afterSaleId;
  feedback.value = null;
  try {
    await merchant.refundAfterSale(
      afterSaleId,
      notes[afterSaleId]?.trim() || "商家确认模拟退款完成",
    );
    feedback.value = "模拟退款已完成，用户端状态已同步";
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
          服务保障
        </p>
        <h1>售后处理</h1>
        <p>核对用户原因并记录处理说明，通过后执行模拟退款闭环。</p>
      </div>
      <span class="workspace-count">{{ merchant.metrics.afterSaleCount }} 项处理中</span>
    </header>

    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索订单号、原因或处理说明"
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
      v-if="merchant.loading && merchant.afterSales.length === 0"
      class="workspace-state"
    >
      正在加载售后记录…
    </section>
    <section
      v-else-if="filteredAfterSales.length === 0"
      class="workspace-empty"
    >
      <FileHeart :size="28" />
      <h2>没有符合条件的售后</h2>
      <p>用户提交申请后会在这里显示。</p>
    </section>
    <section
      v-else
      class="merchant-after-sale-list"
      aria-label="售后记录"
    >
      <article
        v-for="item in filteredAfterSales"
        :key="item.id"
        class="merchant-after-sale-item"
      >
        <header>
          <div>
            <span
              :class="[
                'workspace-status',
                `workspace-status--${item.status.toLowerCase()}`,
              ]"
            >{{ statusLabels[item.status] }}</span>
            <h2>{{ orderFor(item.orderId)?.orderNo ?? item.orderId }}</h2>
            <p>
              {{
                orderFor(item.orderId)?.lines[0]?.productName ?? "酸茶商品"
              }}
              · {{ formatMoney(orderFor(item.orderId)?.totalCents ?? 0) }}
            </p>
          </div>
          <time>{{
            new Date(item.timeline[0]?.at ?? Date.now()).toLocaleString("zh-CN")
          }}</time>
        </header>
        <div class="merchant-after-sale-item__body">
          <section>
            <h3>用户诉求</h3>
            <p>{{ item.reason }}</p>
            <p v-if="item.resolutionNote">
              <strong>处理说明：</strong>{{ item.resolutionNote }}
            </p>
          </section>
          <ol class="merchant-after-sale-timeline">
            <li
              v-for="event in item.timeline"
              :key="`${event.at}-${event.status}`"
            >
              <i />
              <div>
                <strong>{{ event.label }}</strong><span>{{ new Date(event.at).toLocaleString("zh-CN") }}</span>
              </div>
            </li>
          </ol>
          <form
            v-if="item.status === 'REQUESTED' || item.status === 'APPROVED'"
            class="merchant-after-sale-actions"
            @submit.prevent
          >
            <label>处理说明<textarea
              v-model="notes[item.id]"
              rows="3"
              :placeholder="
                item.status === 'APPROVED'
                  ? '可补充退款备注'
                  : '填写审核依据与处理结果'
              "
            />
            </label>
            <div v-if="item.status === 'REQUESTED'">
              <button
                type="button"
                class="workspace-button"
                :disabled="processingId !== null"
                @click="resolve(item.id, 'REJECT')"
              >
                <X :size="17" />拒绝申请
              </button><button
                type="button"
                class="workspace-button workspace-button--primary"
                :disabled="processingId !== null"
                @click="resolve(item.id, 'APPROVE')"
              >
                <Check :size="17" />通过申请
              </button>
            </div>
            <button
              v-else
              type="button"
              class="workspace-button workspace-button--primary"
              :disabled="processingId !== null"
              @click="refund(item.id)"
            >
              <RotateCcw :size="17" />{{
                processingId === item.id ? "退款中…" : "完成模拟退款"
              }}
            </button>
          </form>
        </div>
      </article>
    </section>
  </article>
</template>
