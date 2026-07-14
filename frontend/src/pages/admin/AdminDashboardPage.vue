<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { Banknote, CalendarCheck, FileHeart, PackageSearch, ShoppingBag } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import MetricStrip from '../../components/workspace/MetricStrip.vue'
import { useAdminStore } from '../../stores/admin'
import { formatMoney } from '../../utils/money'

use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const admin = useAdminStore()
type ChartElement = InstanceType<typeof globalThis.HTMLElement>

const orderChartElement = ref<ChartElement | null>(null)
const productChartElement = ref<ChartElement | null>(null)
let orderChart: ECharts | null = null
let productChart: ECharts | null = null

const metricItems = computed(() => [
  { label: '平台成交', value: formatMoney(admin.metrics.revenueCents), detail: '模拟交易口径', icon: Banknote },
  { label: '订单总数', value: admin.metrics.orderCount, detail: '全部履约状态', icon: ShoppingBag },
  { label: '商品总数', value: admin.metrics.productCount, detail: `${admin.productStatusCounts.PENDING} 件待审核`, icon: PackageSearch },
  { label: '预约总数', value: admin.metrics.bookingCount, detail: '线下酸茶体验', icon: CalendarCheck },
  { label: '售后总数', value: admin.metrics.afterSaleCount, detail: '全平台记录', icon: FileHeart },
])
const productLabels = { DRAFT: '草稿', PENDING: '待审核', APPROVED: '已上架', REJECTED: '已驳回', OFF_SHELF: '已下架' } as const

function renderCharts() {
  if (orderChartElement.value) {
    orderChart ??= init(orderChartElement.value)
    orderChart.setOption({
      grid: { left: 36, right: 16, top: 20, bottom: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: admin.orderTrend.map(({ date }) => date.slice(5)), axisLine: { lineStyle: { color: '#aeb8b0' } } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#e1e5e0' } } },
      series: [{ type: 'line', data: admin.orderTrend.map(({ count }) => count), smooth: true, symbolSize: 8, lineStyle: { color: '#315d49', width: 3 }, itemStyle: { color: '#b45a35' }, areaStyle: { color: 'rgba(49, 93, 73, .10)' } }],
    })
  }
  if (productChartElement.value) {
    productChart ??= init(productChartElement.value)
    const statuses = Object.keys(admin.productStatusCounts) as Array<keyof typeof admin.productStatusCounts>
    productChart.setOption({
      grid: { left: 54, right: 16, top: 14, bottom: 32 },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: statuses.map((status) => productLabels[status]), axisLabel: { interval: 0 } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#e1e5e0' } } },
      series: [{ type: 'bar', data: statuses.map((status) => admin.productStatusCounts[status]), barMaxWidth: 36, itemStyle: { color: '#b45a35', borderRadius: [4, 4, 0, 0] } }],
    })
  }
}

function resizeCharts() {
  orderChart?.resize()
  productChart?.resize()
}

onMounted(async () => {
  try {
    await admin.loadDashboard()
    await nextTick()
    renderCharts()
  } catch {
    // Store error is rendered below.
  }
  globalThis.addEventListener('resize', resizeCharts)
})
onBeforeUnmount(() => {
  globalThis.removeEventListener('resize', resizeCharts)
  orderChart?.dispose()
  productChart?.dispose()
})
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          平台运营
        </p><h1>管理看板</h1><p>汇总全平台模拟交易、商品审核、预约与售后数据。</p>
      </div>
      <span class="workspace-count">数据实时读取</span>
    </header>
    <section
      v-if="admin.loading && admin.metrics.orderCount === 0"
      class="workspace-state"
    >
      正在加载平台数据…
    </section>
    <section
      v-else-if="admin.error && admin.metrics.orderCount === 0"
      class="workspace-state workspace-state--error"
    >
      <p>{{ admin.error }}</p><button
        type="button"
        class="workspace-button"
        @click="admin.loadDashboard"
      >
        重新加载
      </button>
    </section>
    <template v-else>
      <MetricStrip :items="metricItems" />
      <div class="admin-chart-grid">
        <section class="workspace-section">
          <div class="workspace-section__heading">
            <div>
              <p class="workspace-eyebrow">
                订单趋势
              </p><h2>每日订单量</h2>
            </div>
          </div>
          <div
            ref="orderChartElement"
            class="admin-chart"
            role="img"
            aria-label="每日订单量折线图"
          />
          <p class="admin-chart-fallback">
            数值：<template v-if="admin.orderTrend.length">
              <span
                v-for="item in admin.orderTrend"
                :key="item.date"
              >{{ item.date }} {{ item.count }} 笔</span>
            </template><span v-else>暂无订单</span>
          </p>
        </section>
        <section class="workspace-section">
          <div class="workspace-section__heading">
            <div>
              <p class="workspace-eyebrow">
                商品分布
              </p><h2>审核状态数量</h2>
            </div>
          </div>
          <div
            ref="productChartElement"
            class="admin-chart"
            role="img"
            aria-label="商品审核状态柱状图"
          />
          <p class="admin-chart-fallback">
            数值：<span
              v-for="(count, status) in admin.productStatusCounts"
              :key="status"
            >{{ productLabels[status] }} {{ count }} 件</span>
          </p>
        </section>
      </div>
    </template>
  </article>
</template>
