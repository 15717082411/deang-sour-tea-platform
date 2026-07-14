<script setup lang="ts">
import { CalendarCheck, FileHeart, PackageCheck, ScrollText } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useAfterSalesStore } from '../../stores/afterSales'
import { useAuthStore } from '../../stores/auth'
import { useBookingsStore } from '../../stores/bookings'
import { useJourneyStore } from '../../stores/journey'
import { useOrdersStore } from '../../stores/orders'

const auth = useAuthStore()
const orders = useOrdersStore()
const bookings = useBookingsStore()
const afterSales = useAfterSalesStore()
const journey = useJourneyStore()
const loading = ref(true)
const posters = ref(0)

const metrics = computed(() => [
  { label: '我的订单', value: orders.orders.length, icon: PackageCheck, to: '/account/orders' },
  { label: '预约记录', value: bookings.bookings.length, icon: CalendarCheck, to: '/account/bookings' },
  { label: '配方海报', value: posters.value, icon: ScrollText, to: '/account/journeys' },
  { label: '售后服务', value: afterSales.afterSales.length, icon: FileHeart, to: '/account/after-sales' },
])

onMounted(async () => {
  posters.value = journey.listPosters().length
  await Promise.allSettled([orders.loadOrders(), bookings.load(), afterSales.load()])
  loading.value = false
})
</script>

<template>
  <section class="account-page">
    <header class="account-page__header">
      <div>
        <p class="account-eyebrow">
          用户档案
        </p><h1>{{ auth.user?.displayName }}</h1>
      </div>
      <span class="account-role">普通用户</span>
    </header>
    <dl class="profile-list">
      <div><dt>账号</dt><dd>{{ auth.user?.username }}</dd></div>
      <div><dt>手机号</dt><dd>{{ auth.user?.phone }}</dd></div>
      <div><dt>商家申请</dt><dd>{{ auth.user?.merchantStatus === 'PENDING' ? '审核中' : auth.user?.merchantStatus === 'REJECTED' ? '可重新申请' : '未申请' }}</dd></div>
    </dl>
    <div
      v-if="loading"
      class="account-state"
      role="status"
    >
      正在汇总账户数据
    </div>
    <nav
      v-else
      class="account-metrics"
      aria-label="用户中心快捷入口"
    >
      <RouterLink
        v-for="metric in metrics"
        :key="metric.to"
        :to="metric.to"
      >
        <component
          :is="metric.icon"
          :size="22"
          aria-hidden="true"
        />
        <strong>{{ metric.value }}</strong><span>{{ metric.label }}</span>
      </RouterLink>
    </nav>
  </section>
</template>
