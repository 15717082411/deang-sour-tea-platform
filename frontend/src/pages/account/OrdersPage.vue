<script setup lang="ts">
import { ArrowRight, ShoppingBag } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { OrderStatus } from '../../domain/types'
import { useOrdersStore } from '../../stores/orders'
import { resolveAssetUrl } from '../../utils/assetUrl'

const orders = useOrdersStore()
const loading = ref(true)
const error = ref<string | null>(null)
const labels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: '待支付',
  PAID: '待发货',
  SHIPPED: '待收货',
  RECEIVED: '已收货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

const money = (cents: number) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(cents / 100)

async function load() {
  loading.value = true
  error.value = null
  try { await orders.loadOrders() } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '订单加载失败'
  } finally { loading.value = false }
}

onMounted(load)
</script>

<template>
  <section class="account-page">
    <header class="account-page__header">
      <div>
        <p class="account-eyebrow">
          交易记录
        </p><h1>我的订单</h1>
      </div>
      <span
        v-if="!loading"
        class="account-count"
      >{{ orders.orders.length }} 笔</span>
    </header>
    <div
      v-if="loading"
      class="account-state"
      role="status"
    >
      正在加载订单
    </div>
    <div
      v-else-if="error"
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
    <div
      v-else-if="orders.orders.length === 0"
      class="account-empty"
    >
      <ShoppingBag
        :size="28"
        aria-hidden="true"
      /><h2>还没有订单</h2>
      <RouterLink
        to="/shop"
        class="account-button account-button--primary"
      >
        前往酸茶商城
      </RouterLink>
    </div>
    <div
      v-else
      class="order-list"
    >
      <article
        v-for="order in orders.orders"
        :key="order.id"
        class="order-row"
      >
        <div class="order-row__meta">
          <span>{{ order.orderNo }}</span><time :datetime="order.createdAt">{{ new Date(order.createdAt).toLocaleDateString('zh-CN') }}</time>
        </div>
        <div class="order-row__body">
          <img
            :src="resolveAssetUrl(order.lines[0]?.image)"
            :alt="`${order.lines[0]?.productName ?? '酸茶商品'}图片`"
          >
          <div><h2>{{ order.lines[0]?.productName }}</h2><p>{{ order.lines.length }} 种商品 · 共 {{ order.lines.reduce((sum, line) => sum + line.quantity, 0) }} 件</p></div>
          <strong>{{ money(order.totalCents) }}</strong>
          <span class="status-badge">{{ labels[order.status] }}</span>
          <RouterLink
            :to="`/account/orders/${order.id}`"
            class="icon-link"
            :aria-label="`查看订单 ${order.orderNo}`"
            title="查看订单"
          >
            <ArrowRight
              :size="20"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
