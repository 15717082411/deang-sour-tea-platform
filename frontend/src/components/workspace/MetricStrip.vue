<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  items: Array<{
    label: string;
    value: string | number;
    detail?: string;
    icon: Component;
  }>;
}>();
</script>

<template>
  <dl class="metric-strip">
    <div
      v-for="item in items"
      :key="item.label"
      class="metric-strip__item"
    >
      <component
        :is="item.icon"
        :size="20"
        aria-hidden="true"
      />
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value }}</dd>
      <small v-if="item.detail">{{ item.detail }}</small>
    </div>
  </dl>
</template>
