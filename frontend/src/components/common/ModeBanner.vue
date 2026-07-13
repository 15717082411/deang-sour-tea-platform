<script setup lang="ts">
import { useAppStore } from '../../stores/app'

const app = useAppStore()
</script>

<template>
  <p v-if="app.mode === 'demo'" class="mode-banner" role="status">演示环境：数据保存在当前浏览器中。</p>
</template>

<style scoped>
.mode-banner { margin: 0; padding: 8px 24px; color: #3f4b2e; background: #e7eddc; font-size: 14px; }
</style>
