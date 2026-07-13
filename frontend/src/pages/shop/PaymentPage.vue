<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PaymentPanel from '../../components/payment/PaymentPanel.vue'
import { useOrdersStore } from '../../stores/orders'

const route = useRoute()
const router = useRouter()
const orders = useOrdersStore()
const loading = ref(true)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try { await orders.loadOrder(String(route.params.orderId)) } catch (caught) { error.value = caught instanceof Error ? caught.message : '订单加载失败' } finally { loading.value = false }
}

async function pay(result: 'SUCCESS' | 'FAILURE' | 'CANCEL') {
  if (orders.currentOrder === null) return
  error.value = null
  notice.value = null
  try {
    const order = await orders.pay(orders.currentOrder.id, result)
    if (result === 'FAILURE') {
      notice.value = '模拟支付未成功，订单仍为待支付，可重新尝试。'
      return
    }
    await router.replace(`/account/orders/${order.id}`)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '模拟支付请求失败'
  }
}

onMounted(load)
</script>

<template>
  <main class="commerce-page commerce-container payment-page">
    <RouterLink
      v-if="orders.currentOrder"
      :to="`/account/orders/${orders.currentOrder.id}`"
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
      v-else-if="error && !orders.currentOrder"
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
    <template v-else-if="orders.currentOrder">
      <header class="commerce-heading">
        <div>
          <p class="commerce-kicker">
            订单 {{ orders.currentOrder.orderNo }}
          </p><h1>订单支付</h1><p>应付金额 ¥{{ (orders.currentOrder.totalCents / 100).toFixed(2) }}</p>
        </div>
      </header>
      <PaymentPanel
        v-if="orders.currentOrder.status === 'PENDING_PAYMENT'"
        :pending="orders.paymentPending"
        @pay="pay"
      />
      <div
        v-else
        class="commerce-state"
      >
        <h2>该订单无需继续支付</h2><p>当前状态：{{ orders.currentOrder.status }}</p><RouterLink
          :to="`/account/orders/${orders.currentOrder.id}`"
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
