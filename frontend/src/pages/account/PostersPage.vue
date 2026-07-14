<script setup lang="ts">
import { ScrollText } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { JourneyPoster } from '../../domain/types'
import { useJourneyStore } from '../../stores/journey'

const journey = useJourneyStore()
const posters = ref<JourneyPoster[]>([])
onMounted(() => { posters.value = journey.listPosters() })
</script>

<template>
  <section class="account-page">
    <header class="account-page__header">
      <div>
        <p class="account-eyebrow">
          互动成果
        </p><h1>配方海报</h1>
      </div><RouterLink
        to="/journey"
        class="account-button account-button--primary"
      >
        开始新旅程
      </RouterLink>
    </header>
    <div
      v-if="posters.length === 0"
      class="account-empty"
    >
      <ScrollText
        :size="28"
        aria-hidden="true"
      /><h2>还没有配方海报</h2><RouterLink
        to="/journey"
        class="account-button account-button--primary"
      >
        完成酸茶互动
      </RouterLink>
    </div>
    <div
      v-else
      class="poster-grid"
    >
      <article
        v-for="poster in posters"
        :key="poster.id"
        class="poster-item"
      >
        <p class="account-eyebrow">
          {{ poster.code }}
        </p><h2>{{ poster.recipe.name }}</h2><p>{{ poster.recipe.description }}</p>
        <ul>
          <li
            v-for="ingredient in poster.recipe.ingredients"
            :key="ingredient"
          >
            {{ ingredient }}
          </li>
        </ul>
        <div class="poster-item__actions">
          <time :datetime="poster.createdAt">{{ new Date(poster.createdAt).toLocaleDateString('zh-CN') }}</time><RouterLink :to="`/booking?poster=${poster.id}`">
            用于预约
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>
