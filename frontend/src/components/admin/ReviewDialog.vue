<script setup lang="ts">
import { Check, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import type { ReviewDecision } from '../../domain/types'

const props = withDefaults(defineProps<{
  open: boolean
  subject: string
  kind: '商家' | '商品'
  pending?: boolean
}>(), { pending: false })

const emit = defineEmits<{
  close: []
  decide: [decision: ReviewDecision]
}>()
const reason = ref('')
const error = ref<string | null>(null)

watch(() => props.open, (open) => {
  if (open) {
    reason.value = ''
    error.value = null
  }
})

function approve() {
  error.value = null
  emit('decide', { result: 'APPROVE', ...(reason.value.trim() ? { reason: reason.value.trim() } : {}) })
}

function reject() {
  const normalized = reason.value.trim()
  if (!normalized) {
    error.value = '请填写驳回理由'
    return
  }
  error.value = null
  emit('decide', { result: 'REJECT', reason: normalized })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="admin-modal-backdrop"
      @click.self="emit('close')"
    >
      <section
        class="admin-review-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-dialog-title"
      >
        <header>
          <div>
            <p class="workspace-eyebrow">
              {{ kind }}审核
            </p><h2 id="review-dialog-title">
              {{ subject }}
            </h2>
          </div><button
            type="button"
            class="workspace-icon-button"
            aria-label="关闭审核对话框"
            title="关闭"
            @click="emit('close')"
          >
            <X :size="18" />
          </button>
        </header>
        <p>请核对提交资料。审核结果会立即同步到对应账号或商品。</p>
        <label>审核说明<textarea
          v-model="reason"
          rows="4"
          placeholder="驳回时必须填写具体理由"
        /></label>
        <p
          v-if="error"
          class="workspace-alert"
          role="alert"
        >
          {{ error }}
        </p>
        <footer>
          <button
            data-testid="review-reject"
            type="button"
            class="workspace-button"
            :disabled="pending"
            @click="reject"
          >
            <X :size="17" />驳回
          </button><button
            data-testid="review-approve"
            type="button"
            class="workspace-button workspace-button--primary"
            :disabled="pending"
            @click="approve"
          >
            <Check :size="17" />通过
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
