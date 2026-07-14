<script setup lang="ts">
import { ArrowRight, Building2, School, UsersRound } from 'lucide-vue-next'
</script>

<template>
  <main class="public-page">
    <header class="story-header">
      <img
        src="/images/artisan-story.webp"
        alt="德昂族酸茶手艺实践者整理茶叶的场景，项目原创视觉"
      >
      <div
        class="story-header__veil"
        aria-hidden="true"
      />
      <div class="public-container story-header__copy">
        <p class="section-kicker">
          项目原创视觉 · 手艺场景
        </p>
        <h1>手艺在真实关系中延续</h1>
        <p>画面不对应任何真实传承人或档案照片。本页只依据公开资料，观察家庭、师徒、工坊培训与公众体验如何共同支撑技艺传承。</p>
      </div>
    </header>

    <section class="narrative-band narrative-band--paper">
      <div class="public-container story-paths">
        <article>
          <UsersRound
            :size="28"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <p class="section-kicker">
            家庭与师徒
          </p>
          <h2>知识在共同实践中传递</h2>
          <p>联合国教科文组织资料说明，中国传统制茶相关知识与实践通过家庭和师徒方式传承。</p>
        </article>
        <article>
          <School
            :size="28"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <p class="section-kicker">
            培养与培训
          </p>
          <h2>让经验成为可持续的学习</h2>
          <p>德宏州公开行动计划提出代表性传承人培养、工坊建设与培训安排。</p>
        </article>
        <article>
          <Building2
            :size="28"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <p class="section-kicker">
            公众体验
          </p>
          <h2>让更多人接近具体工艺</h2>
          <p>行动计划同时提出公众体验点建设与非遗宣传推广，使酸茶制作从文字介绍进入可参与的公共场景。</p>
        </article>
      </div>
    </section>

    <section class="narrative-band narrative-band--green">
      <div class="public-container source-callout">
        <div>
          <p class="section-kicker">
            回到证据
          </p>
          <h2>人物不被虚构，事实可以追溯</h2>
          <p>查看专题正文中的来源标题、发布机构、支持内容与直接访问链接。</p>
        </div>
        <RouterLink
          to="/culture/what-is-sour-tea"
          class="primary-action primary-action--paper"
        >
          查阅来源
          <ArrowRight
            :size="18"
            aria-hidden="true"
          />
        </RouterLink>
      </div>
    </section>
  </main>
</template>
