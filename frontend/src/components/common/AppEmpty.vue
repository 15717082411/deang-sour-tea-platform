<script setup lang="ts">
import { Inbox } from 'lucide-vue-next'
import { useId } from 'vue'

defineProps<{
  title: string
  description?: string
}>()

const headingId = useId()
</script>

<template>
  <section
    class="feedback-state feedback-state--empty"
    data-state="empty"
    :aria-labelledby="headingId"
  >
    <Inbox
      :size="30"
      :stroke-width="1.5"
      aria-hidden="true"
    />
    <h2 :id="headingId">
      {{ title }}
    </h2>
    <p v-if="description">
      {{ description }}
    </p>
    <div
      v-if="$slots.action"
      class="feedback-state__action"
    >
      <slot name="action" />
    </div>
  </section>
</template>

<style scoped>
.feedback-state {
  display: grid;
  min-height: 180px;
  padding: 32px 20px;
  place-items: center;
  align-content: center;
  color: var(--color-muted);
  text-align: center;
  gap: 10px;
}

h2,
p {
  margin: 0;
}

h2 {
  color: var(--color-ink);
  font-size: 20px;
}

.feedback-state__action {
  margin-top: 4px;
}
</style>
