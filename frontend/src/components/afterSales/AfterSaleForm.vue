<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ pending: boolean }>()
const emit = defineEmits<{ submit: [reason: string] }>()
const reason = ref('')

function submit() {
  emit('submit', reason.value)
}
</script>

<template>
  <form
    class="after-sale-form"
    @submit.prevent="submit"
  >
    <label>
      <span>售后原因</span>
      <textarea
        v-model="reason"
        name="reason"
        rows="4"
        maxlength="300"
        required
      />
    </label>
    <button
      type="submit"
      class="account-button"
      :disabled="pending || !reason.trim()"
    >
      {{ pending ? '正在提交' : '提交售后申请' }}
    </button>
  </form>
</template>
