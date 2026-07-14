<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: number
  min?: number
  max: number
  disabled?: boolean
}>(), { min: 1, disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function update(value: number) {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, value)))
}
</script>

<template>
  <div
    class="quantity-stepper"
    aria-label="商品数量"
  >
    <button
      type="button"
      aria-label="减少数量"
      title="减少数量"
      :disabled="disabled || modelValue <= min"
      @click="update(modelValue - 1)"
    >
      <Minus
        :size="17"
        aria-hidden="true"
      />
    </button>
    <input
      :value="modelValue"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="max"
      :disabled="disabled"
      aria-label="数量"
      @change="update(Number(($event.target as HTMLInputElement).value))"
    >
    <button
      type="button"
      aria-label="增加数量"
      title="增加数量"
      :disabled="disabled || modelValue >= max"
      @click="update(modelValue + 1)"
    >
      <Plus
        :size="17"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
