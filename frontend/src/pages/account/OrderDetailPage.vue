<script setup lang="ts">
import { ArrowLeft, CreditCard, PackageCheck } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AfterSaleForm from '../../components/afterSales/AfterSaleForm.vue'
import OrderTimeline from '../../components/orders/OrderTimeline.vue'
import type { Order, OrderStatus } from '../../domain/types'
import { useAfterSalesStore } from '../../stores/afterSales'
import { useOrdersStore } from '../../stores/orders'
import { resolveAssetUrl } from '../../utils/assetUrl'

const route = useRoute()
const orders = useOrdersStore()
const afterSales = useAfterSalesStore()
const order = ref<Order | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const actionMessage = ref<string | null>(null)
let sequence = 0

const labels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付', PAID: '待发货', SHIPPED: '待收货', RECEIVED: '已收货', COMPLETED: '已完成', CANCELLED: '已取消',
}
const activeAfterSaleStatuses = new Set(['REQUESTED', 'PROCESSING', 'APPROVED'])
const hasActiveAfterSale = computed(() => order.value !== null && afterSales.afterSales.some((item) => (
  item.orderId === order.value?.id && activeAfterSaleStatuses.has(item.status)
)))
const canRequestAfterSale = computed(() => order.value !== null
  && ['PAID', 'SHIPPED', 'RECEIVED'].includes(order.value.status)
  && !hasActiveAfterSale.value)
const money = (cents: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(cents / 100)

async function load() {
  const current = ++sequence
  loading.value = true
  error.value = null
  order.value = null
  try {
    const [loaded] = await Promise.all([
      orders.loadOrder(String(route.params.id ?? '')),
      afterSales.load().catch(() => []),
    ])
    if (current === sequence) order.value = loaded
  } catch (caught) {
    if (current === sequence) error.value = caught instanceof Error ? caught.message : '订单加载失败'
  } finally { if (current === sequence) loading.value = false }
}

async function receive() {
  if (order.value === null) return
  error.value = null
  try {
    order.value = await orders.receive(order.value.id)
    actionMessage.value = '已确认收货'
  } catch (caught) { error.value = caught instanceof Error ? caught.message : '确认收货失败' }
}

async function requestAfterSale(reason: string) {
  if (order.value === null) return
  error.value = null
  try {
    await afterSales.request(order.value.id, reason)
    order.value = await orders.loadOrder(order.value.id)
    actionMessage.value = '售后申请已提交'
  } catch (caught) { error.value = caught instanceof Error ? caught.message : '售后申请失败' }
}

watch(() => String(route.params.id ?? ''), load, { immediate: true })
</script>

<template>
  <section class="account-page">
    <RouterLink
      to="/account/orders"
      class="account-back"
    >
      <ArrowLeft
        :size="18"
        aria-hidden="true"
      />返回订单
    </RouterLink>
    <div
      v-if="loading"
      class="account-state"
      role="status"
    >
      正在加载订单
    </div>
    <div
      v-else-if="error && order === null"
      class="account-state account-state--error"
      role="alert"
    >
      <p>{{ error }}</p><button
        type="button"
        class="account-button"
        @click="load"
      >
        重新加载
      </button>
    </div>
    <template v-else-if="order">
      <header class="account-page__header">
        <div>
          <p class="account-eyebrow">
            {{ order.orderNo }}
          </p><h1>订单详情</h1>
        </div><span class="status-badge">{{ labels[order.status] }}</span>
      </header>
      <p
        v-if="error"
        class="account-alert"
        role="alert"
      >
        {{ error }}
      </p>
      <p
        v-if="actionMessage"
        class="account-alert account-alert--success"
        role="status"
      >
        {{ actionMessage }}
      </p>
      <div class="order-detail-grid">
        <div class="order-detail-main">
          <section class="account-section">
            <h2>商品明细</h2>
            <div
              v-for="line in order.lines"
              :key="line.productId"
              class="order-line"
            >
              <img
                :src="resolveAssetUrl(line.image)"
                :alt="`${line.productName}图片`"
              ><div><strong>{{ line.productName }}</strong><span>{{ money(line.unitPriceCents) }} × {{ line.quantity }}</span></div><b>{{ money(line.unitPriceCents * line.quantity) }}</b>
            </div>
            <p class="order-total">
              <span>实付金额</span><strong>{{ money(order.totalCents) }}</strong>
            </p>
          </section>
          <section class="account-section">
            <h2>订单进度</h2><OrderTimeline :events="order.timeline" />
          </section>
        </div>
        <aside class="order-detail-side">
          <section class="account-section">
            <h2>收货信息</h2><p>{{ order.contact.recipient }} · {{ order.contact.phone }}</p><p>{{ order.contact.address }}</p>
          </section>
          <section class="account-section account-actions">
            <h2>订单操作</h2>
            <RouterLink
              v-if="order.status === 'PENDING_PAYMENT'"
              :to="`/payment/${order.id}`"
              class="account-button account-button--primary"
            >
              <CreditCard
                :size="18"
                aria-hidden="true"
              />继续支付
            </RouterLink>
            <button
              v-if="order.status === 'SHIPPED'"
              type="button"
              class="account-button account-button--primary"
              @click="receive"
            >
              <PackageCheck
                :size="18"
                aria-hidden="true"
              />确认收货
            </button>
            <AfterSaleForm
              v-if="canRequestAfterSale"
              :pending="afterSales.submitting"
              @submit="requestAfterSale"
            />
          </section>
        </aside>
      </div>
    </template>
  </section>
</template>
