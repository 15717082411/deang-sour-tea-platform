<script setup lang="ts">
import { CalendarPlus } from 'lucide-vue-next'
import { onMounted } from 'vue'
import { useBookingsStore } from '../../stores/bookings'

const bookings = useBookingsStore()
const labels = { PENDING: '待体验', VERIFIED: '已核销', CANCELLED: '已取消' } as const

async function cancel(id: string) {
  try { await bookings.cancel(id) } catch { /* store renders the recoverable error */ }
}

onMounted(() => { void bookings.load().catch(() => undefined) })
</script>

<template>
  <section class="account-page">
    <header class="account-page__header">
      <div>
        <p class="account-eyebrow">
          线下体验
        </p><h1>预约记录</h1>
      </div><RouterLink
        to="/booking"
        class="account-button account-button--primary"
      >
        <CalendarPlus
          :size="18"
          aria-hidden="true"
        />新增预约
      </RouterLink>
    </header>
    <div
      v-if="bookings.loading"
      class="account-state"
      role="status"
    >
      正在加载预约
    </div>
    <div
      v-else-if="bookings.error && bookings.bookings.length === 0"
      class="account-state account-state--error"
      role="alert"
    >
      <p>{{ bookings.error }}</p><button
        type="button"
        class="account-button"
        @click="bookings.load"
      >
        重新加载
      </button>
    </div>
    <div
      v-else-if="bookings.bookings.length === 0"
      class="account-empty"
    >
      <CalendarPlus
        :size="28"
        aria-hidden="true"
      /><h2>还没有预约</h2><RouterLink
        to="/booking"
        class="account-button account-button--primary"
      >
        预约酸茶工坊
      </RouterLink>
    </div>
    <div
      v-else
      class="booking-list"
    >
      <article
        v-for="booking in bookings.bookings"
        :key="booking.id"
        class="booking-row"
      >
        <time :datetime="booking.date"><strong>{{ booking.date.slice(5) }}</strong><span>{{ booking.date.slice(0, 4) }}</span></time>
        <div>
          <h2>{{ booking.people }} 人酸茶工坊体验</h2><p>
            {{ booking.phone }}<template v-if="booking.posterId">
              · 已关联配方海报
            </template>
          </p><code>{{ booking.code }}</code>
        </div>
        <span class="status-badge">{{ labels[booking.status] }}</span>
        <button
          v-if="booking.status === 'PENDING'"
          type="button"
          class="account-button"
          :disabled="bookings.submitting"
          @click="cancel(booking.id)"
        >
          取消预约
        </button>
        <ol
          class="booking-timeline"
          :aria-label="`预约 ${booking.code} 时间线`"
        >
          <li
            v-for="event in booking.timeline"
            :key="`${event.status}-${event.at}`"
          >
            <strong>{{ event.label }}</strong>
            <time
              v-if="event.timeKnown !== false"
              :datetime="event.at"
            >{{ new Date(event.at).toLocaleString('zh-CN') }}</time>
            <span v-else>时间未知</span>
          </li>
        </ol>
      </article>
    </div>
  </section>
</template>
