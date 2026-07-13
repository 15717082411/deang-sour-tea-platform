<script setup lang="ts">
import { ArrowLeft, CreditCard } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import OrderTimeline from '../../components/orders/OrderTimeline.vue'
import type { OrderStatus } from '../../domain/types'
import { useOrdersStore } from '../../stores/orders'

const route = useRoute()
const orders = useOrdersStore()
const loading = ref(true)
const error = ref<string | null>(null)

const statusLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付', PAID: '已支付', SHIPPED: '已发货', RECEIVED: '已收货', COMPLETED: '已完成', CANCELLED: '已取消', AFTER_SALE_REQUESTED: '售后处理中',
}
const statusLabel = computed(() => orders.currentOrder === null ? '' : statusLabels[orders.currentOrder.status])

async function load() {
  loading.value = true
  error.value = null
  try { await orders.loadOrder(String(route.params.id)) } catch (caught) { error.value = caught instanceof Error ? caught.message : '订单加载失败' } finally { loading.value = false }
}

onMounted(load)
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
    <template v-else-if="orders.currentOrder">
      <header class="commerce-heading order-summary-heading">
        <div>
          <p class="commerce-kicker">
            {{ orders.currentOrder.orderNo }}
          </p><h1>订单详情</h1><p>创建于 {{ new Date(orders.currentOrder.createdAt).toLocaleString('zh-CN') }}</p>
        </div>
        <div class="order-status">
          <span>{{ statusLabel }}</span><strong>¥{{ (orders.currentOrder.totalCents / 100).toFixed(2) }}</strong>
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
            v-for="line in orders.currentOrder.lines"
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
          <h2>收货地址</h2><p>{{ orders.currentOrder.contact.recipient }} · {{ orders.currentOrder.contact.phone }}</p><p>{{ orders.currentOrder.contact.address }}</p>
        </div>
        <div class="order-summary-section">
          <h2>订单进度</h2><OrderTimeline :events="orders.currentOrder.timeline" />
        </div>
      </section>
      <footer
        v-if="orders.currentOrder.status === 'PENDING_PAYMENT'"
        class="order-summary-actions"
      >
        <RouterLink
          :to="`/payment/${orders.currentOrder.id}`"
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
