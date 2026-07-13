<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next'
import CraftTimeline from '../../components/culture/CraftTimeline.vue'
</script>

<template>
  <main class="public-page">
    <header class="page-intro page-intro--craft">
      <div class="public-container page-intro__inner">
        <div>
          <p class="section-kicker">
            德昂族酸茶制作技艺
          </p>
          <h1>从鲜叶到酸茶</h1>
          <p>按公开资料梳理一条可读的制作路径。不同工艺与用途对应不同时间，页面不把任何单一周期写成唯一标准。</p>
          <RouterLink
            to="/culture/fermentation-craft"
            class="inline-link"
          >
            查看完整资料口径
            <ArrowRight
              :size="17"
              aria-hidden="true"
            />
          </RouterLink>
        </div>
        <img
          src="/images/craft-fire.webp"
          alt="灶火旁处理德昂族酸茶鲜叶的手艺场景，项目原创视觉"
        >
      </div>
    </header>

    <section class="narrative-band narrative-band--paper">
      <div class="public-container">
        <div class="section-heading">
          <div>
            <p class="section-kicker">
              工艺时间轴
            </p>
            <h2>五个连续环节，两种后续用途</h2>
          </div>
          <p>从摊放到湿食或干制，逐步查看材料中可核验的动作。</p>
        </div>
        <CraftTimeline />
      </div>
    </section>

    <section class="narrative-band narrative-band--ink">
      <div class="public-container duration-note">
        <p class="section-kicker">
          关于时间
        </p>
        <h2>50—70天、约2个月与更长时间并不矛盾</h2>
        <p>前者是一类坑或地窖工艺的公开记录；约2个月对应食用湿茶；饮用干茶的发酵更长，并有舂制、成形、干燥等后续环节。差异来自材料记录的工艺和用途不同。</p>
      </div>
    </section>
  </main>
</template>
