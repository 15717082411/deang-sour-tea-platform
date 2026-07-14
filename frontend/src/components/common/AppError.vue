<script setup lang="ts">
import { CircleAlert, RefreshCw } from 'lucide-vue-next'

withDefaults(defineProps<{
  title?: string
  message: string
  retryable?: boolean
}>(), {
  title: '暂时无法读取',
  retryable: false,
})

defineEmits<{ retry: [] }>()
</script>

<template>
  <section
    class="feedback-state feedback-state--error"
    role="alert"
  >
    <CircleAlert
      :size="28"
      :stroke-width="1.6"
      aria-hidden="true"
    />
    <div>
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>
    </div>
    <button
      v-if="retryable"
      type="button"
      @click="$emit('retry')"
    >
      <RefreshCw
        :size="17"
        aria-hidden="true"
      />
      重新加载
    </button>
  </section>
</template>

<style scoped>
.feedback-state {
  display: flex;
  min-height: 140px;
  padding: 24px 20px;
  align-items: center;
  justify-content: center;
  color: #8a2f25;
  background: #f8ebe8;
  text-align: left;
  gap: 14px;
}

h2,
p {
  margin: 0;
}

h2 {
  font-size: 18px;
}

p {
  margin-top: 4px;
}

button {
  display: inline-flex;
  min-height: 40px;
  padding: 7px 10px;
  flex: 0 0 auto;
  align-items: center;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  background: #fff;
  font: inherit;
  gap: 6px;
  cursor: pointer;
}

@media (max-width: 560px) {
  .feedback-state {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
