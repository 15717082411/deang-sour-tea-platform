<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import type { ContentArticle } from '../../domain/types'
import { useAppStore } from '../../stores/app'
import { getContentCoverAlt } from '../../utils/contentImages'

const app = useAppStore()
const articles = ref<ContentArticle[]>([])
const state = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')

async function loadContents(): Promise<void> {
  state.value = 'loading'
  errorMessage.value = ''
  try {
    articles.value = await app.repository.listContents()
    state.value = 'ready'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '文化内容暂时无法读取'
    state.value = 'error'
  }
}

onMounted(loadContents)
</script>

<template>
  <main class="public-page">
    <header class="page-intro page-intro--culture">
      <div class="public-container page-intro__inner">
        <div>
          <p class="section-kicker">
            德昂族酸茶专题
          </p>
          <h1>从公开资料读懂酸茶</h1>
          <p>这里不讲泛茶文化，只整理德昂族酸茶的名录信息、制作工艺、食用与饮用路径，并把每项事实连接到可直接访问的来源。</p>
        </div>
        <img
          src="/images/hero-sour-tea.webp"
          alt="竹筛中的德昂族酸茶茶叶，项目原创视觉"
        >
      </div>
    </header>

    <section class="narrative-band narrative-band--light">
      <div class="public-container">
        <p
          v-if="state === 'loading'"
          class="public-state"
          role="status"
          data-state="loading"
        >
          正在读取文化专题…
        </p>
        <div
          v-else-if="state === 'error'"
          class="public-state public-state--error"
          role="alert"
          data-state="error"
        >
          <p>{{ errorMessage }}</p>
          <button
            type="button"
            @click="loadContents"
          >
            重新读取
          </button>
        </div>
        <div
          v-else-if="articles.length === 0"
          class="public-state"
          data-state="empty"
        >
          <h2>暂无已发布内容</h2>
          <p>资料整理完成后会在这里发布。</p>
        </div>
        <div
          v-else
          class="article-rows article-rows--large"
        >
          <RouterLink
            v-for="article in articles"
            :key="article.id"
            :to="`/culture/${article.slug}`"
            class="article-row"
          >
            <img
              :src="article.cover"
              :alt="getContentCoverAlt(article)"
            >
            <div>
              <p class="article-row__category">
                {{ article.category }}
              </p>
              <h2>{{ article.title }}</h2>
              <p>{{ article.summary }}</p>
              <span class="inline-link">查看正文与来源 <ArrowRight
                :size="17"
                aria-hidden="true"
              /></span>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
