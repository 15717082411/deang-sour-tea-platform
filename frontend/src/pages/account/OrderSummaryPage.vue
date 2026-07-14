<script setup lang="ts">
import { ArrowLeft, CreditCard } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import OrderTimeline from '../../components/orders/OrderTimeline.vue'
import type { Order, OrderStatus } from '../../domain/types'
import { useAuthStore } from '../../stores/auth'
import { useOrdersStore } from '../../stores/orders'

const route = useRoute()
const auth = useAuthStore()
const orders = useOrdersStore()
const loading = ref(true)
const error = ref<string | null>(null)
const order = ref<Order | null>(null)
let loadSequence = 0

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付', PAID: '已支付', SHIPPED: '已发货', RECEIVED: '已收货', COMPLETED: '已完成', CANCELLED: '已取消',
}
const statusLabel = computed(() => order.value === null ? '' : statusLabels[order.value.status])

async function load() {
  const sequence = ++loadSequence
  const userId = auth.user?.id ?? null
  const orderId = String(route.params.id ?? '')
  loading.value = true
  error.value = null
  order.value = null
  if (userId === null || !orderId) {
    error.value = '无权查看该订单'
    loading.value = false
    return
  }
  try {
    const loaded = await orders.loadOrder(orderId, orderId)
    if (sequence === loadSequence && auth.user?.id === userId && String(route.params.id ?? '') === orderId) order.value = loaded
  } catch (caught) {
    if (sequence === loadSequence) error.value = caught instanceof Error ? caught.message : '订单加载失败'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(
  [() => auth.user?.id ?? null, () => String(route.params.id ?? '')],
  load,
  { immediate: true },
)
</script>

<template>
  <section class="order-summary-page">
    <RouterLink
      to="/account/orders"
      class="back-link"
    >
      <ArrowLeft
        :size="18"
        aria-hidden="true"
      />返回订单列表
    </RouterLink>
    <p
      v-if="loading"
      class="commerce-state"
      role="status"
    >
      正在加载订单…
    </p>
    <div
      v-else-if="error"
      class="commerce-state commerce-state--error"
      role="alert"
    >
      <h1>无法查看订单</h1><p>{{ error }}</p><button
        type="button"
        class="commerce-button"
        @click="load"
      >
        重新加载
      </button>
    </div>
    <template v-else-if="order">
      <header class="commerce-heading order-summary-heading">
        <div>
          <p class="commerce-kicker">
            {{ order.orderNo }}
          </p><h1>订单详情</h1><p>创建于 {{ new Date(order.createdAt).toLocaleString('zh-CN') }}</p>
        </div>
        <div class="order-status">
          <span>{{ statusLabel }}</span><strong>¥{{ (order.totalCents / 100).toFixed(2) }}</strong>
        </div>
      </header>
      <section
        class="order-summary-section"
        aria-labelledby="order-products"
      >
        <h2 id="order-products">
          商品
        </h2><ul class="order-lines">
          <li
            v-for="line in order.lines"
            :key="line.productId"
          >
            <img
              :src="line.image"
              :alt="line.productName"
            ><span>{{ line.productName }} × {{ line.quantity }}</span><strong>¥{{ ((line.unitPriceCents * line.quantity) / 100).toFixed(2) }}</strong>
          </li>
        </ul>
      </section>
      <section class="order-summary-grid">
        <div class="order-summary-section">
          <h2>收货地址</h2><p>{{ order.contact.recipient }} · {{ order.contact.phone }}</p><p>{{ order.contact.address }}</p>
        </div>
        <div class="order-summary-section">
          <h2>订单进度</h2><OrderTimeline :events="order.timeline" />
        </div>
      </section>
      <footer
        v-if="order.status === 'PENDING_PAYMENT'"
        class="order-summary-actions"
      >
        <RouterLink
          :to="`/payment/${order.id}`"
          class="commerce-button commerce-button--primary"
        >
          <CreditCard
            :size="19"
            aria-hidden="true"
          />继续支付
        </RouterLink>
      </footer>
    </template>
  </section>
</template>
