<script setup lang="ts">
import { Check, Clipboard, MapPin } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import BookingForm from '../../components/booking/BookingForm.vue'
import type { Booking, BookingInput, JourneyPoster } from '../../domain/types'
import { useBookingsStore } from '../../stores/bookings'
import { useJourneyStore } from '../../stores/journey'

const bookings = useBookingsStore()
const journey = useJourneyStore()
const route = useRoute()
const posters = ref<JourneyPoster[]>([])
const booking = ref<Booking | null>(null)
const error = ref<string | null>(null)
const copied = ref(false)
const initialPosterId = computed(() => {
  const requested = String(route.query.poster ?? '')
  return posters.value.some(({ id }) => id === requested) ? requested : undefined
})

onMounted(() => { posters.value = journey.listPosters() })

async function submit(input: BookingInput) {
  error.value = null
  copied.value = false
  try { booking.value = await bookings.create(input) } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '预约提交失败'
  }
}

async function copyCode() {
  if (booking.value === null) return
  if (globalThis.navigator.clipboard?.writeText) await globalThis.navigator.clipboard.writeText(booking.value.code)
  copied.value = true
}
</script>

<template>
  <main class="booking-page">
    <header class="booking-header">
      <p class="account-eyebrow">
        德昂族酸茶线下体验
      </p>
      <h1>预约酸茶工坊</h1>
      <p>
        <MapPin
          :size="18"
          aria-hidden="true"
        />云南省德宏州芒市 · 预约成功后凭核销码入场
      </p>
    </header>
    <div class="booking-layout">
      <section class="booking-form-panel">
        <h2>选择体验安排</h2>
        <p
          v-if="error"
          class="account-alert"
          role="alert"
        >
          {{ error }}
        </p>
        <BookingForm
          :posters="posters"
          :pending="bookings.submitting"
          :initial-poster-id="initialPosterId"
          @submit="submit"
        />
      </section>
      <section
        v-if="booking"
        data-testid="booking-success"
        class="booking-success"
        role="status"
      >
        <Check
          :size="30"
          aria-hidden="true"
        /><p class="account-eyebrow">
          预约成功
        </p><h2>{{ booking.date }} · {{ booking.people }} 人</h2>
        <p>到场核销码</p><strong data-testid="booking-code">{{ booking.code }}</strong>
        <button
          data-testid="copy-booking-code"
          type="button"
          class="account-button"
          @click="copyCode"
        >
          <Clipboard
            :size="18"
            aria-hidden="true"
          />{{ copied ? '已复制' : '复制核销码' }}
        </button>
        <RouterLink to="/account/bookings">
          查看预约记录
        </RouterLink>
      </section>
      <aside
        v-else
        class="booking-notes"
      >
        <h2>体验内容</h2>
        <ol><li>认识德昂族酸茶原料与非遗技艺</li><li>观察揉捻、发酵与干制工具</li><li>品鉴酸茶并交流风味记录</li></ol>
      </aside>
    </div>
  </main>
</template>
