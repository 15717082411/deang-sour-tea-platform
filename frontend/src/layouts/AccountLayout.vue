<script setup lang="ts">
import { CalendarDays, FileHeart, Package, ScrollText, UserRound } from 'lucide-vue-next'
import AppHeader from '../components/common/AppHeader.vue'
import ModeBanner from '../components/common/ModeBanner.vue'

const links = [
  { to: '/account', label: '用户档案', icon: UserRound, exact: true },
  { to: '/account/orders', label: '我的订单', icon: Package },
  { to: '/account/bookings', label: '预约记录', icon: CalendarDays },
  { to: '/account/journeys', label: '配方海报', icon: ScrollText },
  { to: '/account/after-sales', label: '售后服务', icon: FileHeart },
]
</script>

<template>
  <AppHeader />
  <ModeBanner />
  <section class="account-layout">
    <aside aria-label="用户中心导航">
      <p class="account-layout__title">
        用户中心
      </p>
      <nav>
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :active-class="link.exact ? '' : 'router-link-active'"
          :exact-active-class="link.exact ? 'router-link-active' : ''"
        >
          <component
            :is="link.icon"
            :size="18"
            aria-hidden="true"
          />{{ link.label }}
        </RouterLink>
      </nav>
    </aside>
    <main><RouterView /></main>
  </section>
</template>

<style scoped>
.account-layout { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: calc(100vh - 64px); }
aside { padding: 24px; border-right: 1px solid var(--color-border); background: #f8faf7; }
.account-layout__title { margin: 0 0 20px; font-size: 20px; font-weight: 700; }
nav { display: grid; gap: 12px; }
a { display: inline-flex; min-height: 44px; padding: 0 10px; align-items: center; border-left: 3px solid transparent; color: var(--color-ink); gap: 9px; text-decoration: none; }
a.router-link-active { border-left-color: #37624f; background: #edf3ef; font-weight: 700; }
main { min-width: 0; padding: 32px; }
@media (max-width: 720px) { .account-layout { grid-template-columns: 1fr; } aside { overflow-x: auto; padding: 14px 16px 10px; border-right: 0; border-bottom: 1px solid var(--color-border); } .account-layout__title { display: none; } nav { display: flex; width: max-content; gap: 4px; } a { border-bottom: 3px solid transparent; border-left: 0; white-space: nowrap; } a.router-link-active { border-bottom-color: #37624f; } main { padding: 20px 16px; } }
</style>
