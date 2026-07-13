<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, BookmarkPlus, CalendarDays, ChevronRight, RotateCcw } from 'lucide-vue-next'
import JourneyStep from '../../components/journey/JourneyStep.vue'
import RecipePoster from '../../components/journey/RecipePoster.vue'
import type { JourneyChoice } from '../../domain/types'
import { useAuthStore } from '../../stores/auth'
import {
  JOURNEY_STEPS,
  JourneyAuthenticationRequiredError,
  useJourneyStore,
} from '../../stores/journey'
import '../../styles/journey.css'

const auth = useAuthStore()
const journey = useJourneyStore()
const router = useRouter()
const saveError = ref('')

const currentStep = computed(() => JOURNEY_STEPS[journey.currentStepIndex] ?? null)
const currentChoice = computed(() => {
  if (currentStep.value === null) return null
  return journey.choices[currentStep.value.id] ?? null
})

function selectChoice(choice: JourneyChoice) {
  journey.selectChoice(choice)
}

function advance() {
  journey.advance()
}

function restart() {
  saveError.value = ''
  journey.restart()
}

async function savePoster() {
  saveError.value = ''
  try {
    journey.savePoster()
  } catch (reason) {
    if (reason instanceof JourneyAuthenticationRequiredError) {
      await router.push({ name: 'login', query: { redirect: '/journey' } })
      return
    }
    saveError.value = reason instanceof Error ? reason.message : '保存失败，请稍后重试。'
  }
}
</script>

<template>
  <main class="journey-page public-page">
    <header class="journey-intro">
      <div class="public-container journey-intro__inner">
        <div>
          <p class="section-kicker">
            互动体验
          </p>
          <h1>茶魂寻踪</h1>
        </div>
        <p>沿着源起、自然与技艺完成三次取舍，生成一份属于此刻的酸茶风味配方。</p>
      </div>
    </header>

    <section
      class="journey-progress"
      aria-label="旅程进度"
    >
      <div class="public-container">
        <ol>
          <li
            v-for="(step, index) in JOURNEY_STEPS"
            :key="step.id"
            :class="{
              'journey-progress__item--current': index === journey.currentStepIndex,
              'journey-progress__item--complete': index < journey.currentStepIndex,
            }"
            :aria-current="index === journey.currentStepIndex ? 'step' : undefined"
          >
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ step.eyebrow.split(' · ')[1] }}</strong>
          </li>
        </ol>
      </div>
    </section>

    <section
      v-if="currentStep"
      class="journey-stage"
    >
      <div class="public-container journey-stage__inner">
        <JourneyStep
          :step="currentStep"
          :model-value="currentChoice"
          @update:model-value="selectChoice"
        />

        <nav
          class="journey-controls"
          aria-label="旅程步骤操作"
        >
          <button
            v-if="journey.currentStepIndex > 0"
            type="button"
            class="journey-action journey-action--secondary"
            data-testid="journey-back"
            @click="journey.goBack()"
          >
            <ArrowLeft
              :size="18"
              aria-hidden="true"
            />
            返回
          </button>
          <span v-else />
          <button
            type="button"
            class="journey-action journey-action--primary"
            data-testid="journey-next"
            :disabled="currentChoice === null"
            @click="advance"
          >
            {{ journey.currentStepIndex === JOURNEY_STEPS.length - 1 ? '生成配方' : '下一步' }}
            <ChevronRight
              :size="18"
              aria-hidden="true"
            />
          </button>
        </nav>
      </div>
    </section>

    <section
      v-else-if="journey.currentPoster"
      class="journey-result"
    >
      <div class="public-container journey-result__inner">
        <RecipePoster
          :poster="journey.currentPoster"
          :display-name="auth.user?.displayName"
        />

        <div class="journey-result__actions">
          <p
            v-if="saveError"
            class="journey-save-error"
            role="alert"
          >
            {{ saveError }}
          </p>
          <p
            v-if="journey.saveStatus === 'saved'"
            class="journey-save-success"
            role="status"
          >
            配方海报保存成功，可携配方码预约工坊体验。
          </p>
          <div class="journey-result__buttons">
            <button
              type="button"
              class="journey-action journey-action--secondary"
              data-testid="journey-restart"
              @click="restart"
            >
              <RotateCcw
                :size="18"
                aria-hidden="true"
              />
              重新开始
            </button>
            <button
              type="button"
              class="journey-action journey-action--primary"
              data-testid="save-poster"
              :disabled="journey.saveStatus === 'saved'"
              @click="savePoster"
            >
              <BookmarkPlus
                :size="18"
                aria-hidden="true"
              />
              {{ journey.saveStatus === 'saved' ? '已保存' : '保存配方海报' }}
            </button>
            <RouterLink
              v-if="journey.saveStatus === 'saved'"
              to="/booking"
              class="journey-action journey-action--booking"
              data-testid="booking-action"
            >
              <CalendarDays
                :size="18"
                aria-hidden="true"
              />
              预约工坊
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
