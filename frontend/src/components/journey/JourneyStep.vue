<script setup lang="ts">
import type { JourneyChoice } from '../../domain/types'
import type { JourneyStepDefinition } from '../../stores/journey'

const props = defineProps<{
  step: JourneyStepDefinition
  modelValue: JourneyChoice | null
}>()

const emit = defineEmits<{
  'update:modelValue': [choice: JourneyChoice]
}>()

function selectOption(optionId: string) {
  const option = props.step.options.find(({ id }) => id === optionId)
  if (option === undefined) return
  emit('update:modelValue', { stepId: props.step.id, optionId: option.id, trait: option.trait })
}
</script>

<template>
  <fieldset class="journey-step">
    <legend>
      <span>{{ step.eyebrow }}</span>
      <strong data-testid="journey-step-title">{{ step.title }}</strong>
    </legend>
    <p
      :id="`${step.id}-prompt`"
      class="journey-step__prompt"
    >
      {{ step.prompt }}
    </p>
    <div
      class="journey-options"
      :aria-describedby="`${step.id}-prompt`"
    >
      <label
        v-for="option in step.options"
        :key="option.id"
        class="journey-option"
        :class="{ 'journey-option--selected': modelValue?.optionId === option.id }"
      >
        <input
          type="radio"
          :name="`journey-${step.id}`"
          :value="option.id"
          :checked="modelValue?.optionId === option.id"
          @change="selectOption(option.id)"
        >
        <span
          class="journey-option__marker"
          aria-hidden="true"
        />
        <span class="journey-option__copy">
          <strong>{{ option.label }}</strong>
          <small>{{ option.detail }}</small>
        </span>
      </label>
    </div>
  </fieldset>
</template>
