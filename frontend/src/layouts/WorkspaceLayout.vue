<script setup lang="ts">
import { Boxes, ClipboardCheck, FileHeart, Gauge, LayoutDashboard, Library, PackageCheck, ShoppingBag, Store, UsersRound } from 'lucide-vue-next'
import { computed } from 'vue'
import AppHeader from '../components/common/AppHeader.vue'
import ModeBanner from '../components/common/ModeBanner.vue'
import { useAuthStore } from '../stores/auth'

const props = defineProps<{ kind: 'merchant' | 'admin' }>()
const auth = useAuthStore()

const workspace = computed(() => props.kind === 'merchant'
  ? {
      title: '商家中心',
      subtitle: auth.user?.displayName ?? '酸茶商家',
      icon: Store,
      links: [
        { label: '经营概览', to: '/merchant', icon: Gauge },
        { label: '商品管理', to: '/merchant/products', icon: Boxes },
        { label: '订单发货', to: '/merchant/orders', icon: PackageCheck },
        { label: '售后处理', to: '/merchant/after-sales', icon: FileHeart },
      ],
    }
  : {
      title: '管理后台',
      subtitle: auth.user?.displayName ?? '平台管理员',
      icon: LayoutDashboard,
      links: [
        { label: '平台看板', to: '/admin', icon: LayoutDashboard },
        { label: '商家审核', to: '/admin/merchants', icon: UsersRound },
        { label: '商品审核', to: '/admin/products', icon: ShoppingBag },
        { label: '文化内容', to: '/admin/contents', icon: Library },
        { label: '预约核销', to: '/admin/bookings', icon: ClipboardCheck },
      ],
    },
)
</script>

<template>
  <ModeBanner />
  <AppHeader />
  <section class="workspace-layout">
    <aside :aria-label="`${workspace.title}导航`">
      <div class="workspace-layout__identity">
        <component
          :is="workspace.icon"
          :size="22"
          aria-hidden="true"
        />
        <div><strong>{{ workspace.title }}</strong><span>{{ workspace.subtitle }}</span></div>
      </div>
      <nav>
        <RouterLink
          v-for="link in workspace.links"
          :key="link.to"
          :to="link.to"
        >
          <component
            :is="link.icon"
            :size="18"
            aria-hidden="true"
          />
          {{ link.label }}
        </RouterLink>
      </nav>
    </aside>
    <main><RouterView /></main>
  </section>
</template>
