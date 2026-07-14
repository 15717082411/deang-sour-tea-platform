<script setup lang="ts">
withDefaults(defineProps<{
  lines?: number
  label?: string
}>(), {
  lines: 3,
  label: '正在加载',
})
</script>

<template>
  <div
    class="app-skeleton"
    role="status"
    aria-busy="true"
    :aria-label="label"
  >
    <span
      v-for="line in lines"
      :key="line"
      class="app-skeleton__line"
      :class="{ 'app-skeleton__line--short': line === lines }"
      data-skeleton-line
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.app-skeleton {
  display: grid;
  min-height: 140px;
  padding: 24px 0;
  align-content: center;
  gap: 14px;
}

.app-skeleton__line {
  width: 100%;
  height: 18px;
  border-radius: 4px;
  background: #e7ebe5;
  animation: skeleton-pulse 1.2s ease-in-out infinite alternate;
}

.app-skeleton__line--short {
  width: 62%;
}

@keyframes skeleton-pulse {
  from { opacity: 0.55; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .app-skeleton__line { animation: none; }
}
</style>
