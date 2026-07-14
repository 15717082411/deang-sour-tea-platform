<script setup lang="ts">
import { ArrowLeft, RotateCcw } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SourceList from '../../components/culture/SourceList.vue'
import { hasRepositoryErrorCode } from '../../data/repository'
import type { ContentArticle } from '../../domain/types'
import { useAppStore } from '../../stores/app'
import { resolveAssetUrl } from '../../utils/assetUrl'
import { getContentCoverAlt } from '../../utils/contentImages'

const app = useAppStore()
const route = useRoute()
const article = ref<ContentArticle | null>(null)
const state = ref<'loading' | 'ready' | 'not-found' | 'error'>('loading')
const errorMessage = ref('')
let requestId = 0

const paragraphs = computed(() => article.value?.body.split('\n\n').filter(Boolean) ?? [])

async function loadArticle(): Promise<void> {
  const activeRequest = ++requestId
  state.value = 'loading'
  article.value = null
  errorMessage.value = ''
  try {
    const content = await app.repository.getContent(String(route.params.slug ?? ''))
    if (activeRequest !== requestId) return
    article.value = content
    state.value = 'ready'
  } catch (error) {
    if (activeRequest !== requestId) return
    errorMessage.value = error instanceof Error ? error.message : '文化内容暂时无法读取'
    state.value = hasRepositoryErrorCode(error, 'CONTENT_NOT_FOUND') ? 'not-found' : 'error'
  }
}

watch(() => route.params.slug, loadArticle, { immediate: true })
</script>

<template>
  <main
    class="public-page culture-detail"
    :aria-busy="state === 'loading'"
  >
    <div
      v-if="state === 'loading'"
      class="public-state public-state--page"
      role="status"
      data-state="loading"
    >
      正在加载文化资料…
    </div>

    <section
      v-else-if="state === 'not-found'"
      class="public-state public-state--page"
      data-state="not-found"
    >
      <p class="section-kicker">
        404 · 文化资料
      </p>
      <h1>没有找到这篇内容</h1>
      <p>链接可能已失效，或者内容尚未发布。</p>
      <RouterLink
        to="/culture"
        class="inline-link"
      >
        <ArrowLeft
          :size="17"
          aria-hidden="true"
        />
        返回文化专题
      </RouterLink>
    </section>

    <section
      v-else-if="state === 'error'"
      class="public-state public-state--page public-state--error"
      role="alert"
      data-state="error"
    >
      <p class="section-kicker">
        读取失败
      </p>
      <h1>文化资料暂时无法打开</h1>
      <p>{{ errorMessage }}</p>
      <button
        type="button"
        @click="loadArticle"
      >
        <RotateCcw
          :size="17"
          aria-hidden="true"
        />
        重新读取
      </button>
    </section>

    <article v-else-if="article">
      <header class="article-hero">
        <img
          :src="resolveAssetUrl(article.cover)"
          :alt="getContentCoverAlt(article)"
        >
        <div class="article-hero__copy public-container">
          <RouterLink
            to="/culture"
            class="article-hero__back"
          >
            <ArrowLeft
              :size="17"
              aria-hidden="true"
            />
            文化专题
          </RouterLink>
          <p class="section-kicker">
            {{ article.category }}
          </p>
          <h1>{{ article.title }}</h1>
          <p>{{ article.summary }}</p>
        </div>
      </header>

      <div class="narrative-band narrative-band--paper">
        <div class="public-container article-body">
          <div class="article-body__prose">
            <p
              v-for="paragraph in paragraphs"
              :key="paragraph"
            >
              {{ paragraph }}
            </p>
          </div>
          <aside class="article-body__note">
            <strong>阅读说明</strong>
            <p>文化事实以页面所列来源为依据；项目原创视觉仅用于说明场景，不作为档案证据。</p>
          </aside>
        </div>
      </div>

      <div class="narrative-band narrative-band--light">
        <div class="public-container">
          <SourceList :sources="article.sources" />
        </div>
      </div>
    </article>
  </main>
</template>
