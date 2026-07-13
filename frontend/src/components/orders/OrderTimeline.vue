<script setup lang="ts">
import type { TimelineEvent } from '../../domain/types'

defineProps<{ events: TimelineEvent[] }>()
</script>

<template>
  <ol
    class="order-timeline"
    aria-label="订单时间线"
  >
    <li
      v-for="(event, index) in events"
      :key="`${event.status}-${event.at}-${index}`"
    >
      <span
        class="order-timeline__marker"
        aria-hidden="true"
      />
      <div>
        <strong>{{ event.label }}</strong>
        <time :datetime="event.at">{{ new Date(event.at).toLocaleString('zh-CN') }}</time>
        <p v-if="event.note">
          {{ event.note }}
        </p>
      </div>
    </li>
  </ol>
</template>
