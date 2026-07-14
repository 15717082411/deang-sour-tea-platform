<script setup lang="ts">
import { Coffee, Flame, Hand, Leaf, PackageOpen } from 'lucide-vue-next'
import { CRAFT_FERMENTATION_ALT } from '../../utils/contentImages'

const steps = [
  {
    number: '01',
    title: '鲜叶摊放',
    detail: '大叶种鲜叶置于竹席或竹盘，避开阳光直射摊放。',
    icon: Leaf,
  },
  {
    number: '02',
    title: '洗叶与蒸制',
    detail: '洗净鲜叶后蒸制，再让叶片自然冷却，为揉捻做准备。',
    icon: Flame,
    image: '/images/craft-fire.webp',
    alt: '酸茶鲜叶在灶火旁进行蒸制处理，项目原创视觉',
  },
  {
    number: '03',
    title: '手工揉捻',
    detail: '冷却后的叶片经过揉捻，随后进入装筒与密封环节。',
    icon: Hand,
  },
  {
    number: '04',
    title: '装筒密封发酵',
    detail: '茶叶装入竹筒或竹篮后密封捆扎。公开材料记录一类坑或地窖工艺为50—70天。',
    icon: PackageOpen,
    image: '/images/craft-fermentation.webp',
    alt: CRAFT_FERMENTATION_ALT,
  },
  {
    number: '05',
    title: '湿食或干制饮用',
    detail: '用途决定后续路径：食用湿茶约发酵2个月；冲泡干茶发酵更长，并继续舂制、成形和干燥。',
    icon: Coffee,
  },
]
</script>

<template>
  <ol class="craft-timeline">
    <li
      v-for="step in steps"
      :key="step.number"
      class="craft-timeline__step"
    >
      <div class="craft-timeline__marker">
        <span>{{ step.number }}</span>
        <component
          :is="step.icon"
          :size="22"
          :stroke-width="1.7"
          aria-hidden="true"
        />
      </div>
      <div class="craft-timeline__copy">
        <h3>{{ step.title }}</h3>
        <p>{{ step.detail }}</p>
      </div>
      <img
        v-if="step.image"
        class="craft-timeline__image"
        :src="step.image"
        :alt="step.alt"
      >
    </li>
  </ol>
</template>
