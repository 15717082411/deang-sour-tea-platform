<script setup lang="ts">
import { CalendarDays, Users } from 'lucide-vue-next'
import { computed, reactive, watch } from 'vue'
import type { BookingInput, JourneyPoster } from '../../domain/types'

const props = defineProps<{
  posters: JourneyPoster[]
  pending: boolean
  initialPosterId?: string
}>()

const emit = defineEmits<{
  submit: [input: BookingInput]
}>()

const form = reactive({ date: '', people: 2, phone: '', posterId: props.initialPosterId ?? '' })
watch(() => props.initialPosterId, (posterId) => {
  if (posterId && !form.posterId) form.posterId = posterId
})
const tomorrow = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

function submit() {
  emit('submit', {
    date: form.date,
    people: Number(form.people),
    phone: form.phone,
    ...(form.posterId ? { posterId: form.posterId } : {}),
  })
}
</script>

<template>
  <form
    class="account-form"
    @submit.prevent="submit"
  >
    <label>
      <span>体验日期</span>
      <span class="account-input-wrap"><CalendarDays
        :size="18"
        aria-hidden="true"
      /><input
        v-model="form.date"
        name="date"
        type="date"
        :min="tomorrow"
        required
      ></span>
    </label>
    <label>
      <span>体验人数</span>
      <span class="account-input-wrap"><Users
        :size="18"
        aria-hidden="true"
      /><input
        v-model.number="form.people"
        name="people"
        type="number"
        min="1"
        max="12"
        step="1"
        required
      ></span>
    </label>
    <label>
      <span>联系电话</span>
      <input
        v-model="form.phone"
        name="phone"
        type="tel"
        inputmode="numeric"
        autocomplete="tel"
        pattern="1[3-9][0-9]{9}"
        required
      >
    </label>
    <label>
      <span>配方海报</span>
      <select
        v-model="form.posterId"
        name="posterId"
      >
        <option value="">
          不关联海报
        </option>
        <option
          v-for="poster in props.posters"
          :key="poster.id"
          :value="poster.id"
        >
          {{ poster.recipe.name }} · {{ poster.code }}
        </option>
      </select>
    </label>
    <button
      class="account-button account-button--primary"
      type="submit"
      :disabled="props.pending"
    >
      {{ props.pending ? '正在提交' : '确认预约' }}
    </button>
  </form>
</template>
