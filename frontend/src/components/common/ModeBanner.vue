<script setup lang="ts">
import { useAppStore } from '../../stores/app'
import ModeSwitcher from './ModeSwitcher.vue'

const app = useAppStore()
</script>

<template>
  <section
    class="mode-banner"
    :class="`mode-banner--${app.mode}`"
    role="status"
  >
    <span v-if="app.mode === 'hybrid'">API 已连接 · 部分闭环为演示数据</span>
    <span v-else>离线演示模式 · 数据保存在当前浏览器中</span>
    <ModeSwitcher />
  </section>
</template>

<style scoped>
.mode-banner {
  display: flex;
  min-height: 44px;
  margin: 0;
  padding: 6px 24px;
  align-items: center;
  justify-content: space-between;
  color: #354431;
  background: #e7eddc;
  font-size: 14px;
  gap: 16px;
}

.mode-banner--hybrid {
  color: #174f48;
  background: #dcece8;
}

@media (max-width: 640px) {
  .mode-banner {
    padding-inline: 16px;
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
