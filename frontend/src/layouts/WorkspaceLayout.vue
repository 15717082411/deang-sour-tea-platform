<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ kind: 'merchant' | 'admin' }>()

const workspace = computed(() => props.kind === 'merchant'
  ? { title: '商家中心', links: [{ label: '经营概览', to: '/merchant' }, { label: '商品管理', to: '/merchant/products' }, { label: '订单发货', to: '/merchant/orders' }, { label: '售后处理', to: '/merchant/after-sales' }] }
  : { title: '管理后台', links: [{ label: '平台看板', to: '/admin' }, { label: '商家审核', to: '/admin/merchants' }, { label: '商品审核', to: '/admin/products' }, { label: '文化内容', to: '/admin/contents' }, { label: '预约核销', to: '/admin/bookings' }] },
)
</script>

<template>
  <section class="workspace-layout">
    <aside :aria-label="`${workspace.title}导航`">
      <h1>{{ workspace.title }}</h1>
      <nav><RouterLink v-for="link in workspace.links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink></nav>
    </aside>
    <main><RouterView /></main>
  </section>
</template>

<style scoped>
.workspace-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); min-height: 100vh; background: #f7f8f4; }
aside { padding: 24px; border-right: 1px solid var(--color-border); background: var(--color-surface); }
h1 { margin: 0 0 20px; font-size: 20px; }
nav { display: grid; gap: 12px; }
a { color: var(--color-ink); text-decoration: none; }
main { padding: 32px; }
@media (max-width: 720px) { .workspace-layout { grid-template-columns: 1fr; } aside { border-right: 0; border-bottom: 1px solid var(--color-border); } nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } main { padding: 20px; } }
</style>
