<script setup lang="ts">
import { Plus, Search } from "lucide-vue-next";

withDefaults(
  defineProps<{
    modelValue: string;
    status: string;
    statusOptions: Array<{ label: string; value: string }>;
    placeholder?: string;
    actionLabel?: string;
  }>(),
  {
    placeholder: "搜索",
    actionLabel: "",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:status": [value: string];
  action: [];
}>();
</script>

<template>
  <div class="filter-bar">
    <label class="filter-bar__search">
      <Search
        :size="18"
        aria-hidden="true"
      />
      <span class="sr-only">{{ placeholder }}</span>
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        @input="
          emit('update:modelValue', ($event.target as HTMLInputElement).value)
        "
      >
    </label>
    <label class="filter-bar__select">
      <span class="sr-only">状态筛选</span>
      <select
        :value="status"
        @change="
          emit('update:status', ($event.target as HTMLSelectElement).value)
        "
      >
        <option
          v-for="option in statusOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </label>
    <slot />
    <button
      v-if="actionLabel"
      type="button"
      class="workspace-button workspace-button--primary filter-bar__action"
      @click="emit('action')"
    >
      <Plus
        :size="18"
        aria-hidden="true"
      />
      {{ actionLabel }}
    </button>
  </div>
</template>
