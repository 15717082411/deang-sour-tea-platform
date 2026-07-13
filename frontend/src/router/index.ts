import type { Pinia } from 'pinia'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { Role } from '../domain/types'
import AccountLayout from '../layouts/AccountLayout.vue'
import PublicLayout from '../layouts/PublicLayout.vue'
import WorkspaceLayout from '../layouts/WorkspaceLayout.vue'
import LoginPage from '../pages/auth/LoginPage.vue'
import RegisterPage from '../pages/auth/RegisterPage.vue'
import ForbiddenPage from '../pages/system/ForbiddenPage.vue'
import NotFoundPage from '../pages/system/NotFoundPage.vue'
import { useAuthStore } from '../stores/auth'
export { sanitizeRedirect } from './redirect'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: Role[]
    merchantApproved?: boolean
  }
}

const PendingPage = { template: '<main class="route-placeholder"><h1>内容准备中</h1></main>' }

const publicRoutes: RouteRecordRaw[] = [
  { path: '', name: 'home', component: () => import('../pages/public/HomePage.vue') },
  { path: 'culture', name: 'culture', component: () => import('../pages/public/CultureIndexPage.vue') },
  { path: 'culture/:slug', name: 'culture-detail', component: () => import('../pages/public/CultureDetailPage.vue') },
  { path: 'craft', name: 'craft', component: () => import('../pages/public/CraftPage.vue') },
  { path: 'stories', name: 'stories', component: () => import('../pages/public/StoriesPage.vue') },
  { path: 'journey', name: 'journey', component: PendingPage },
  { path: 'shop', name: 'shop', component: PendingPage },
  { path: 'shop/:id', name: 'product-detail', component: PendingPage },
  { path: 'cart', name: 'cart', component: PendingPage },
  { path: 'checkout', name: 'checkout', component: PendingPage, meta: { requiresAuth: true } },
  { path: 'payment/:orderId', name: 'payment', component: PendingPage, meta: { requiresAuth: true } },
  { path: 'booking', name: 'booking', component: PendingPage, meta: { requiresAuth: true } },
  { path: 'login', name: 'login', component: LoginPage },
  { path: 'register', name: 'register', component: RegisterPage },
]

const routes: RouteRecordRaw[] = [
  { path: '/', component: PublicLayout, children: publicRoutes },
  { path: '/merchant/apply', name: 'merchant-apply', component: PendingPage, meta: { requiresAuth: true, roles: ['USER', 'MERCHANT'] } },
  {
    path: '/account', component: AccountLayout, meta: { requiresAuth: true }, children: [
      { path: '', name: 'account', component: PendingPage },
      { path: 'orders', name: 'account-orders', component: PendingPage },
      { path: 'bookings', name: 'account-bookings', component: PendingPage },
      { path: 'journeys', name: 'account-journeys', component: PendingPage },
      { path: 'after-sales', name: 'account-after-sales', component: PendingPage },
    ],
  },
  {
    path: '/merchant', component: WorkspaceLayout, props: { kind: 'merchant' }, meta: { requiresAuth: true, roles: ['MERCHANT'], merchantApproved: true }, children: [
      { path: '', name: 'merchant', component: PendingPage },
      { path: 'products', name: 'merchant-products', component: PendingPage },
      { path: 'orders', name: 'merchant-orders', component: PendingPage },
      { path: 'after-sales', name: 'merchant-after-sales', component: PendingPage },
    ],
  },
  {
    path: '/admin', component: WorkspaceLayout, props: { kind: 'admin' }, meta: { requiresAuth: true, roles: ['ADMIN'] }, children: [
      { path: '', name: 'admin', component: PendingPage },
      { path: 'merchants', name: 'admin-merchants', component: PendingPage },
      { path: 'products', name: 'admin-products', component: PendingPage },
      { path: 'contents', name: 'admin-contents', component: PendingPage },
      { path: 'bookings', name: 'admin-bookings', component: PendingPage },
    ],
  },
  { path: '/403', name: 'forbidden', component: ForbiddenPage },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
]

export function createAppRouter(pinia: Pinia) {
  const router = createRouter({ history: createWebHistory(), routes })
  router.beforeEach(async (to) => {
    const auth = useAuthStore(pinia)
    await auth.rehydrate()
    if (to.meta.requiresAuth !== true) return true
    if (!auth.isAuthenticated) return { name: 'login', query: { redirect: to.fullPath } }
    const isMerchantApplicant = auth.user?.role === 'USER' || auth.user?.role === 'MERCHANT'
    if (to.meta.merchantApproved === true && isMerchantApplicant && auth.user?.merchantStatus !== 'APPROVED') return { name: 'merchant-apply' }
    return auth.canAccess(to) ? true : { name: 'forbidden' }
  })
  return router
}
