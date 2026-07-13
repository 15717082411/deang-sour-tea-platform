<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PaymentPanel from '../../components/payment/PaymentPanel.vue'
import type { Order } from '../../domain/types'
import { useAuthStore } from '../../stores/auth'
import { useOrdersStore } from '../../stores/orders'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const orders = useOrdersStore()
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)
const order = ref<Order | null>(null)
let loadSequence = 0

async function load() {
  const sequence = ++loadSequence
  const userId = auth.user?.id ?? null
  const orderId = String(route.params.orderId ?? '')
  loading.value = true
  error.value = null
  notice.value = null
  order.value = null
  if (userId === null || !orderId) {
    error.value = '无权查看该订单'
    loading.value = false
    return
  }
  try {
    const loaded = await orders.loadOrder(orderId, orderId)
    if (sequence === loadSequence && auth.user?.id === userId && String(route.params.orderId ?? '') === orderId) order.value = loaded
  } catch (caught) {
    if (sequence === loadSequence) error.value = caught instanceof Error ? caught.message : '订单加载失败'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function pay(result: 'SUCCESS' | 'FAILURE' | 'CANCEL') {
  if (order.value === null) return
  const orderId = order.value.id
  const userId = auth.user?.id
  error.value = null
  notice.value = null
  try {
    const paidOrder = await orders.pay(orderId, result)
    if (auth.user?.id !== userId || String(route.params.orderId ?? '') !== orderId) return
    order.value = paidOrder
    if (result === 'FAILURE') {
      notice.value = '模拟支付未成功，订单仍为待支付，可重新尝试。'
      return
    }
    await router.replace(`/account/orders/${paidOrder.id}`)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '模拟支付请求失败'
  }
}

watch(
  [() => auth.user?.id ?? null, () => String(route.params.orderId ?? '')],
  load,
  { immediate: true },
)
</script>

<template>
  <main class="commerce-page commerce-container payment-page">
    <RouterLink
      v-if="order && !loading && !error"
      :to="`/account/orders/${order.id}`"
      class="back-link"
    >
      <ArrowLeft
        :size="18"
        aria-hidden="true"
      />返回订单详情
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
      <h1>无法继续支付</h1><p>{{ error }}</p><button
        type="button"
        class="commerce-button"
        @click="load"
      >
        重新加载
      </button>
    </div>
    <template v-else-if="order">
      <header class="commerce-heading">
        <div>
          <p class="commerce-kicker">
            订单 {{ order.orderNo }}
          </p><h1>订单支付</h1><p>应付金额 ¥{{ (order.totalCents / 100).toFixed(2) }}</p>
        </div>
      </header>
      <PaymentPanel
        v-if="order.status === 'PENDING_PAYMENT'"
        :pending="orders.paymentPending"
        @pay="pay"
      />
      <div
        v-else
        class="commerce-state"
      >
        <h2>该订单无需继续支付</h2><p>当前状态：{{ order.status }}</p><RouterLink
          :to="`/account/orders/${order.id}`"
          class="commerce-button"
        >
          查看订单详情
        </RouterLink>
      </div>
      <p
        v-if="notice"
        class="commerce-feedback"
        role="status"
      >
        {{ notice }}
      </p>
      <p
        v-if="error"
        class="commerce-feedback commerce-feedback--error"
        role="alert"
      >
        {{ error }}
      </p>
    </template>
  </main>
</template>
