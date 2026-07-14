<script setup lang="ts">
import { RefreshCw, WifiOff } from 'lucide-vue-next'
import { ref } from 'vue'
import { useAppStore } from '../../stores/app'

const app = useAppStore()
const busy = ref(false)

async function retryApi(): Promise<void> {
  if (busy.value) return
  busy.value = true
  try {
    await app.detectApi()
  } finally {
    busy.value = false
  }
}

async function switchToDemo(): Promise<void> {
  const confirmed = globalThis.confirm('切换后将继续使用当前浏览器中的演示数据，确定继续吗？')
  if (!confirmed) return
  await app.switchToDemo(true)
}
</script>

<template>
  <button
    v-if="app.mode === 'hybrid'"
    class="mode-switcher"
    type="button"
    data-testid="switch-to-demo"
    @click="switchToDemo"
  >
    <WifiOff
      :size="16"
      aria-hidden="true"
    />
    使用离线演示
  </button>
  <button
    v-else
    class="mode-switcher"
    type="button"
    data-testid="retry-api"
    :disabled="busy"
    @click="retryApi"
  >
    <RefreshCw
      :size="16"
      aria-hidden="true"
    />
    {{ busy ? '检测中' : '重新检测 API' }}
  </button>
</template>

<style scoped>
.mode-switcher {
  display: inline-flex;
  min-height: 32px;
  padding: 4px 8px;
  align-items: center;
  border: 1px solid currentColor;
  border-radius: 4px;
  color: inherit;
  background: transparent;
  font: inherit;
  gap: 6px;
  cursor: pointer;
}

.mode-switcher:disabled {
  cursor: wait;
  opacity: 0.65;
}
</style>
