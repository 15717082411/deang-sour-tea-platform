<script setup lang="ts">
import { ArrowRight, BookOpen, MapPin } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import AppEmpty from '../../components/common/AppEmpty.vue'
import AppError from '../../components/common/AppError.vue'
import AppSkeleton from '../../components/common/AppSkeleton.vue'
import type { ContentArticle } from '../../domain/types'
import { useAppStore } from '../../stores/app'
import { CRAFT_FERMENTATION_ALT, getContentCoverAlt } from '../../utils/contentImages'

const app = useAppStore()
const articles = ref<ContentArticle[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function loadArticles(): Promise<void> {
  isLoading.value = true
  loadError.value = ''
  try {
    articles.value = await app.repository.listContents()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '文化内容暂时无法读取'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadArticles)
</script>

<template>
  <main class="public-page home-page">
    <section
      class="culture-hero"
      aria-labelledby="home-title"
    >
      <img
        class="culture-hero__image"
        src="/images/hero-sour-tea.webp"
        alt="竹筛中铺开的德昂族酸茶茶叶与手工处理场景，项目原创视觉"
      >
      <div
        class="culture-hero__veil"
        aria-hidden="true"
      />
      <div class="culture-hero__content public-container">
        <p class="culture-hero__location">
          <MapPin
            :size="18"
            aria-hidden="true"
          />
          云南德宏 · 芒市
        </p>
        <h1 id="home-title">
          德昂族酸茶
        </h1>
        <p class="culture-hero__lead">
          从一片大叶种鲜叶出发，读懂蒸制、揉捻、密封发酵，以及湿食与干制饮用的不同路径。
        </p>
        <div class="culture-hero__actions">
          <RouterLink
            to="/journey"
            class="primary-action"
            data-testid="primary-journey-action"
          >
            开始酸茶之旅
            <ArrowRight
              :size="19"
              aria-hidden="true"
            />
          </RouterLink>
          <RouterLink
            to="/culture"
            class="secondary-action"
          >
            查阅文化资料
          </RouterLink>
        </div>
      </div>
      <a
        class="culture-hero__next"
        href="#uses"
      >
        <span>下一章</span>
        湿茶与干茶
      </a>
    </section>

    <section
      id="uses"
      class="narrative-band narrative-band--paper"
    >
      <div class="public-container split-narrative">
        <div class="split-narrative__copy">
          <p class="section-kicker">
            一片叶的两种去向
          </p>
          <h2>湿茶食用，干茶冲泡</h2>
          <p>国家级非遗项目资料记录，发酵后的酸茶可保留为湿茶食用，也可继续舂制、成形和干燥，成为冲泡饮用的干茶。</p>
          <RouterLink
            to="/culture/what-is-sour-tea"
            class="inline-link"
          >
            阅读资料与出处
            <ArrowRight
              :size="17"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
        <figure class="split-narrative__media">
          <img
            src="/images/craft-fermentation.webp"
            :alt="CRAFT_FERMENTATION_ALT"
          >
          <figcaption>项目原创视觉 · 发酵工艺场景</figcaption>
        </figure>
      </div>
    </section>

    <section class="narrative-band narrative-band--ink">
      <div class="public-container fact-band">
        <div>
          <p class="section-kicker">
            时间不是单一答案
          </p>
          <h2>工艺与用途，决定发酵时长</h2>
        </div>
        <div class="fact-band__facts">
          <p><strong>50—70天</strong><span>一类坑或地窖工艺的公开记录</span></p>
          <p><strong>约2个月</strong><span>食用湿茶的公开记录</span></p>
          <p><strong>更长</strong><span>饮用干茶还需后续舂制、成形与干燥</span></p>
        </div>
        <p class="fact-band__note">
          三个口径并列呈现，不把其中任何一个写成唯一标准。
        </p>
      </div>
    </section>

    <section class="narrative-band narrative-band--light">
      <div class="public-container">
        <div class="section-heading">
          <div>
            <p class="section-kicker">
              公开资料
            </p>
            <h2>从来源开始认识酸茶</h2>
          </div>
          <BookOpen
            :size="28"
            :stroke-width="1.5"
            aria-hidden="true"
          />
        </div>
        <AppSkeleton
          v-if="isLoading"
          :lines="3"
          label="正在读取文化内容"
        />
        <AppError
          v-else-if="loadError"
          title="文化内容读取失败"
          :message="loadError"
          retryable
          @retry="loadArticles"
        />
        <AppEmpty
          v-else-if="articles.length === 0"
          title="暂无已发布内容"
          description="资料整理完成后会在这里发布。"
        />
        <div
          v-else
          class="article-rows"
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
              <h3>{{ article.title }}</h3>
              <p>{{ article.summary }}</p>
            </div>
            <ArrowRight
              :size="22"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="narrative-band narrative-band--red story-teaser">
      <div class="public-container split-narrative split-narrative--reverse">
        <figure class="split-narrative__media">
          <img
            src="/images/artisan-story.webp"
            alt="德昂族酸茶手艺实践者整理茶叶的场景，项目原创视觉"
          >
          <figcaption>项目原创视觉 · 手艺场景，不对应真实传承人</figcaption>
        </figure>
        <div class="split-narrative__copy">
          <p class="section-kicker">
            手艺如何继续
          </p>
          <h2>从家庭与师徒，到工坊和公众体验</h2>
          <p>公开资料记录了家庭与师徒传承方式；地方行动计划进一步提出传承人培养、工坊培训和公众体验点建设。</p>
          <RouterLink
            to="/stories"
            class="inline-link inline-link--light"
          >
            进入传承故事
            <ArrowRight
              :size="17"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
