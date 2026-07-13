<script setup lang="ts">
import { Menu, ShieldCheck, Store, UserRound, X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../../stores/app'
import { useAuthStore } from '../../stores/auth'

const app = useAppStore()
const auth = useAuthStore()
const router = useRouter()

const publicLinks = [
  { label: '首页', to: '/' },
  { label: '酸茶文化', to: '/culture' },
  { label: '制作技艺', to: '/craft' },
  { label: '传承故事', to: '/stories' },
  { label: '互动体验', to: '/journey' },
  { label: '酸茶商城', to: '/shop' },
]

const workspace = computed(() => {
  if (auth.user?.role === 'ADMIN') return { label: '管理后台', to: '/admin', icon: ShieldCheck }
  if (auth.user?.role === 'MERCHANT') return { label: '商家中心', to: '/merchant', icon: Store }
  return { label: '用户中心', to: '/account', icon: UserRound }
})

async function logout() {
  await auth.logout()
  app.closeMobileNavigation()
  await router.replace('/')
}
</script>

<template>
  <header class="app-header">
    <RouterLink
      class="brand"
      to="/"
      @click="app.closeMobileNavigation"
    >
      德昂族酸茶
    </RouterLink>
    <nav
      class="desktop-nav"
      aria-label="主导航"
    >
      <RouterLink
        v-for="link in publicLinks"
        :key="link.to"
        :to="link.to"
      >
        {{ link.label }}
      </RouterLink>
      <RouterLink to="/booking">
        预约体验
      </RouterLink>
    </nav>
    <div class="desktop-actions">
      <RouterLink
        v-if="auth.isAuthenticated"
        :to="workspace.to"
        class="account-link"
      >
        <component
          :is="workspace.icon"
          :size="18"
          aria-hidden="true"
        />
        <span>{{ workspace.label }}</span>
      </RouterLink>
      <button
        v-if="auth.isAuthenticated"
        type="button"
        class="text-button"
        @click="logout"
      >
        退出登录
      </button>
      <RouterLink
        v-else
        to="/login"
        class="account-link"
      >
        <UserRound
          :size="18"
          aria-hidden="true"
        /><span>登录</span>
      </RouterLink>
    </div>
    <button
      class="menu-button"
      type="button"
      aria-label="打开导航菜单"
      title="打开导航菜单"
      @click="app.openMobileNavigation"
    >
      <Menu
        :size="22"
        aria-hidden="true"
      />
    </button>
    <nav
      v-if="app.mobileNavigationOpen"
      data-testid="mobile-navigation"
      class="mobile-navigation"
      aria-label="移动主导航"
    >
      <div class="mobile-navigation__heading">
        <span>导航</span>
        <button
          type="button"
          aria-label="关闭导航菜单"
          title="关闭导航菜单"
          @click="app.closeMobileNavigation"
        >
          <X
            :size="22"
            aria-hidden="true"
          />
        </button>
      </div>
      <RouterLink
        v-for="link in publicLinks"
        :key="link.to"
        :to="link.to"
        @click="app.closeMobileNavigation"
      >
        {{ link.label }}
      </RouterLink>
      <RouterLink
        to="/booking"
        @click="app.closeMobileNavigation"
      >
        预约体验
      </RouterLink>
      <RouterLink
        v-if="auth.isAuthenticated"
        :to="workspace.to"
        @click="app.closeMobileNavigation"
      >
        {{ workspace.label }}
      </RouterLink>
      <RouterLink
        v-else
        to="/login"
        @click="app.closeMobileNavigation"
      >
        登录
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.app-header { position: relative; display: flex; align-items: center; min-height: 64px; padding: 0 24px; border-bottom: 1px solid var(--color-border); background: var(--color-surface); gap: 24px; }
.brand { color: var(--color-ink); font-size: 20px; font-weight: 700; text-decoration: none; white-space: nowrap; }
.desktop-nav { display: flex; align-items: center; gap: 18px; flex: 1; }
.desktop-nav a, .account-link, .mobile-navigation a { color: var(--color-ink); text-decoration: none; }
.desktop-actions { display: flex; align-items: center; gap: 12px; }
.account-link { display: inline-flex; align-items: center; gap: 6px; }
.text-button, .menu-button, .mobile-navigation button { min-width: 40px; min-height: 40px; border: 0; background: transparent; color: var(--color-ink); cursor: pointer; }
.menu-button { display: none; }
.mobile-navigation { position: absolute; z-index: 10; top: 0; right: 0; display: grid; width: min(320px, 100vw); min-height: 100vh; padding: 20px; background: var(--color-surface); box-shadow: -8px 0 24px rgb(29 37 32 / 18%); gap: 14px; }
.mobile-navigation__heading { display: flex; align-items: center; justify-content: space-between; font-weight: 700; }
@media (max-width: 860px) { .app-header { padding: 0 16px; justify-content: space-between; } .desktop-nav, .desktop-actions { display: none; } .menu-button { display: inline-flex; align-items: center; justify-content: center; } }
</style>
