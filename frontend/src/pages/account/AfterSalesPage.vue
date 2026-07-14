<script setup lang="ts">
import { FileHeart } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useAfterSalesStore } from '../../stores/afterSales'

const afterSales = useAfterSalesStore()
const labels = { REQUESTED: '待处理', PROCESSING: '处理中', APPROVED: '已通过', REJECTED: '已拒绝', REFUNDED: '已退款', CLOSED: '已关闭' } as const
onMounted(() => { void afterSales.load().catch(() => undefined) })
</script>

<template>
  <section class="account-page">
    <header class="account-page__header">
      <div>
        <p class="account-eyebrow">
          订单保障
        </p><h1>售后服务</h1>
      </div><RouterLink
        to="/account/orders"
        class="account-button"
      >
        查看订单
      </RouterLink>
    </header>
    <div
      v-if="afterSales.loading"
      class="account-state"
      role="status"
    >
      正在加载售后记录
    </div>
    <div
      v-else-if="afterSales.error && afterSales.afterSales.length === 0"
      class="account-state account-state--error"
      role="alert"
    >
      <p>{{ afterSales.error }}</p><button
        type="button"
        class="account-button"
        @click="afterSales.load"
      >
        重新加载
      </button>
    </div>
    <div
      v-else-if="afterSales.afterSales.length === 0"
      class="account-empty"
    >
      <FileHeart
        :size="28"
        aria-hidden="true"
      /><h2>还没有售后记录</h2><RouterLink
        to="/account/orders"
        class="account-button account-button--primary"
      >
        查看可申请订单
      </RouterLink>
    </div>
    <div
      v-else
      class="after-sale-list"
    >
      <article
        v-for="item in afterSales.afterSales"
        :key="item.id"
        class="after-sale-row"
      >
        <div>
          <p class="account-eyebrow">
            {{ item.id }}
          </p><h2>{{ item.reason }}</h2><RouterLink :to="`/account/orders/${item.orderId}`">
            查看关联订单
          </RouterLink>
        </div>
        <span class="status-badge">{{ labels[item.status] }}</span>
        <ol>
          <li
            v-for="event in item.timeline"
            :key="`${event.status}-${event.at}`"
          >
            <strong>{{ event.label }}</strong><time :datetime="event.at">{{ new Date(event.at).toLocaleString('zh-CN') }}</time>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>
