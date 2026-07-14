<script setup lang="ts">
import { computed } from 'vue'
import type { JourneyPoster } from '../../domain/types'
import { CRAFT_FERMENTATION_ALT } from '../../utils/contentImages'

const props = defineProps<{
  poster: JourneyPoster
  displayName?: string
}>()

const createdDate = computed(() => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date(props.poster.createdAt)))
</script>

<template>
  <article
    class="recipe-poster"
    data-testid="recipe-poster"
    aria-labelledby="recipe-name"
  >
    <div class="recipe-poster__visual">
      <img
        src="/images/craft-fermentation.webp"
        :alt="CRAFT_FERMENTATION_ALT"
      >
      <p>茶魂寻踪 · 互动配方</p>
    </div>
    <div class="recipe-poster__content">
      <header>
        <p class="recipe-poster__eyebrow">
          为你生成
        </p>
        <h2 id="recipe-name">
          {{ poster.recipe.name }}
        </h2>
        <p>{{ poster.recipe.description }}</p>
      </header>

      <section aria-labelledby="ingredient-title">
        <h3 id="ingredient-title">
          配方原料
        </h3>
        <ul>
          <li
            v-for="ingredient in poster.recipe.ingredients"
            :key="ingredient"
            data-testid="recipe-ingredient"
          >
            {{ ingredient }}
          </li>
        </ul>
      </section>

      <footer>
        <dl>
          <div>
            <dt>创建日期</dt>
            <dd>{{ createdDate }}</dd>
          </div>
          <div v-if="displayName">
            <dt>寻茶人</dt>
            <dd>{{ displayName }}</dd>
          </div>
          <div>
            <dt>配方码</dt>
            <dd data-testid="poster-code">
              {{ poster.code }}
            </dd>
          </div>
        </dl>
        <p class="recipe-poster__note">
          此配方仅为互动风味推荐，不构成医疗或保健建议。
        </p>
      </footer>
    </div>
  </article>
</template>
