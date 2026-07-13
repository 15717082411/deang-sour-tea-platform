<script setup lang="ts">
import { ScanLine } from 'lucide-vue-next'
import { ref } from 'vue'

defineProps<{ pending: boolean }>()
const emit = defineEmits<{ verify: [code: string] }>()
const code = ref('')

function submit() {
  const normalized = code.value.trim()
  if (normalized) emit('verify', normalized)
}
</script>

<template>
  <form
    data-testid="verify-booking"
    class="verify-code-panel"
    @submit.prevent="submit"
  >
    <div>
      <p class="workspace-eyebrow">
        现场核销
      </p><h2>输入预约核销码</h2><p>核销成功后不可重复使用。</p>
    </div>
    <label><ScanLine
      :size="20"
      aria-hidden="true"
    /><span class="sr-only">预约核销码</span><input
      v-model="code"
      name="verificationCode"
      autocomplete="off"
      placeholder="例如 BOOK-DEMO-01"
    ></label>
    <button
      type="submit"
      class="workspace-button workspace-button--primary"
      :disabled="pending || !code.trim()"
    >
      {{ pending ? '核销中…' : '确认核销' }}
    </button>
  </form>
</template>
