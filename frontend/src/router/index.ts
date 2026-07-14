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

const publicRoutes: RouteRecordRaw[] = [
  { path: '', name: 'home', component: () => import('../pages/public/HomePage.vue') },
  { path: 'culture', name: 'culture', component: () => import('../pages/public/CultureIndexPage.vue') },
  { path: 'culture/:slug', name: 'culture-detail', component: () => import('../pages/public/CultureDetailPage.vue') },
  { path: 'craft', name: 'craft', component: () => import('../pages/public/CraftPage.vue') },
  { path: 'stories', name: 'stories', component: () => import('../pages/public/StoriesPage.vue') },
  { path: 'journey', name: 'journey', component: () => import('../pages/journey/JourneyPage.vue') },
  { path: 'shop', name: 'shop', component: () => import('../pages/shop/ShopPage.vue') },
  { path: 'shop/:id', name: 'product-detail', component: () => import('../pages/shop/ProductDetailPage.vue') },
  { path: 'cart', name: 'cart', component: () => import('../pages/shop/CartPage.vue') },
  { path: 'checkout', name: 'checkout', component: () => import('../pages/shop/CheckoutPage.vue'), meta: { requiresAuth: true, roles: ['USER'] } },
  { path: 'payment/:orderId', name: 'payment', component: () => import('../pages/shop/PaymentPage.vue'), meta: { requiresAuth: true, roles: ['USER'] } },
  { path: 'booking', name: 'booking', component: () => import('../pages/booking/BookingPage.vue'), meta: { requiresAuth: true, roles: ['USER'] } },
  { path: 'login', name: 'login', component: LoginPage },
  { path: 'register', name: 'register', component: RegisterPage },
]

const routes: RouteRecordRaw[] = [
  { path: '/', component: PublicLayout, children: publicRoutes },
  { path: '/merchant/apply', name: 'merchant-apply', component: () => import('../pages/merchant/MerchantApplyPage.vue'), meta: { requiresAuth: true, roles: ['USER', 'MERCHANT'] } },
  {
    path: '/account', component: AccountLayout, meta: { requiresAuth: true, roles: ['USER'] }, children: [
      { path: '', name: 'account', component: () => import('../pages/account/AccountOverviewPage.vue'), meta: { roles: ['USER'] } },
      { path: 'orders', name: 'account-orders', component: () => import('../pages/account/OrdersPage.vue'), meta: { roles: ['USER'] } },
      { path: 'orders/:id', name: 'account-order-detail', component: () => import('../pages/account/OrderDetailPage.vue'), meta: { roles: ['USER'] } },
      { path: 'bookings', name: 'account-bookings', component: () => import('../pages/account/BookingsPage.vue'), meta: { roles: ['USER'] } },
      { path: 'journeys', name: 'account-journeys', component: () => import('../pages/account/PostersPage.vue'), meta: { roles: ['USER'] } },
      { path: 'after-sales', name: 'account-after-sales', component: () => import('../pages/account/AfterSalesPage.vue'), meta: { roles: ['USER'] } },
    ],
  },
  {
    path: '/merchant', component: WorkspaceLayout, props: { kind: 'merchant' }, meta: { requiresAuth: true, roles: ['MERCHANT'], merchantApproved: true }, children: [
      { path: '', name: 'merchant', component: () => import('../pages/merchant/MerchantDashboardPage.vue') },
      { path: 'products', name: 'merchant-products', component: () => import('../pages/merchant/MerchantProductsPage.vue') },
      { path: 'products/new', name: 'merchant-product-new', component: () => import('../pages/merchant/MerchantProductEditPage.vue') },
      { path: 'products/:id/edit', name: 'merchant-product-edit', component: () => import('../pages/merchant/MerchantProductEditPage.vue') },
      { path: 'orders', name: 'merchant-orders', component: () => import('../pages/merchant/MerchantOrdersPage.vue') },
      { path: 'after-sales', name: 'merchant-after-sales', component: () => import('../pages/merchant/MerchantAfterSalesPage.vue') },
    ],
  },
  {
    path: '/admin', component: WorkspaceLayout, props: { kind: 'admin' }, meta: { requiresAuth: true, roles: ['ADMIN'] }, children: [
      { path: '', name: 'admin', component: () => import('../pages/admin/AdminDashboardPage.vue') },
      { path: 'merchants', name: 'admin-merchants', component: () => import('../pages/admin/AdminMerchantsPage.vue') },
      { path: 'products', name: 'admin-products', component: () => import('../pages/admin/AdminProductsPage.vue') },
      { path: 'contents', name: 'admin-contents', component: () => import('../pages/admin/AdminContentsPage.vue') },
      { path: 'bookings', name: 'admin-bookings', component: () => import('../pages/admin/AdminBookingsPage.vue') },
    ],
  },
  { path: '/403', name: 'forbidden', component: ForbiddenPage },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
]

export function createAppRouter(pinia: Pinia) {
  const router = createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes })
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
