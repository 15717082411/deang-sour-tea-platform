<script setup lang="ts">
import { CalendarCheck } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import VerifyCodePanel from '../../components/admin/VerifyCodePanel.vue'
import FilterBar from '../../components/workspace/FilterBar.vue'
import { useAdminStore } from '../../stores/admin'

const admin = useAdminStore()
const keyword = ref('')
const status = ref('ALL')
const labels = { PENDING: '待核销', VERIFIED: '已核销', CANCELLED: '已取消' } as const
const statusOptions = [{ label: '全部状态', value: 'ALL' }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))]
const bookings = computed(() => admin.bookings.filter((booking) => {
  const matches = `${booking.code}${booking.phone}${booking.date}${booking.userId}`.toLowerCase().includes(keyword.value.trim().toLowerCase())
  return matches && (status.value === 'ALL' || booking.status === status.value)
}))

onMounted(() => { void admin.loadBookings().catch(() => undefined) })
async function verify(code: string) {
  try { await admin.verifyBooking(code) } catch { /* Store error is rendered below. */ }
}
</script>

<template>
  <article class="workspace-page">
    <header class="workspace-page__header">
      <div>
        <p class="workspace-eyebrow">
          线下体验
        </p><h1>预约核销</h1><p>凭用户预约码完成一次性现场核销，并保留核销人和时间。</p>
      </div><span class="workspace-count">{{ admin.bookings.filter(({ status: itemStatus }) => itemStatus === 'PENDING').length }} 项待核销</span>
    </header>
    <VerifyCodePanel
      :pending="admin.pendingOperations > 0"
      @verify="verify"
    />
    <p
      v-if="admin.feedback"
      class="workspace-alert workspace-alert--success"
      role="status"
    >
      {{ admin.feedback }}
    </p>
    <p
      v-if="admin.error"
      class="workspace-alert"
      role="alert"
    >
      {{ admin.error }}
    </p>
    <FilterBar
      v-model="keyword"
      v-model:status="status"
      :status-options="statusOptions"
      placeholder="搜索核销码、手机号、日期或用户"
    />
    <section
      v-if="admin.loading && admin.bookings.length === 0"
      class="workspace-state"
    >
      正在加载预约…
    </section>
    <section
      v-else-if="bookings.length === 0"
      class="workspace-empty"
    >
      <CalendarCheck :size="28" /><h2>没有符合条件的预约</h2>
    </section>
    <div
      v-else
      class="workspace-table-wrap"
    >
      <table class="workspace-table admin-booking-table">
        <thead><tr><th>核销码</th><th>体验日期</th><th>用户</th><th>人数</th><th>状态</th><th>核销信息</th><th><span class="sr-only">操作</span></th></tr></thead><tbody>
          <tr
            v-for="booking in bookings"
            :key="booking.id"
          >
            <td><code>{{ booking.code }}</code></td><td>{{ booking.date }}</td><td>{{ booking.phone }}<small>{{ booking.userId }}</small></td><td>{{ booking.people }} 人</td><td><span :class="['workspace-status', `workspace-status--${booking.status.toLowerCase()}`]">{{ labels[booking.status] }}</span></td><td>
              <template v-if="booking.verifiedAt">
                {{ new Date(booking.verifiedAt).toLocaleString('zh-CN') }}<small>{{ booking.verifiedBy }}</small>
              </template><span
                v-else
                class="workspace-row-muted"
              >未核销</span>
            </td><td>
              <button
                v-if="booking.status === 'PENDING'"
                type="button"
                class="workspace-button workspace-button--primary workspace-button--compact"
                :disabled="admin.pendingOperations > 0"
                @click="verify(booking.code)"
              >
                现场核销
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>
