# Final Interactive Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static MVP with a polished Vue 3 application that completes the Deang sour tea culture, account, commerce, merchant, and administration flows in API-connected and offline demo modes.

**Architecture:** Build one Vue application with public, account, merchant, and admin route groups. Pinia stores depend on repository interfaces; a gateway composes the Spring Boot API adapter with a versioned local demo repository and exposes the active capability mode. Domain state machines remain framework-independent and are tested before UI integration.

**Tech Stack:** Vue 3, TypeScript, Vite, Vue Router, Pinia, Axios, Element Plus, Lucide Vue Next, ECharts, Vitest, Vue Test Utils, Playwright, ESLint, Prettier, vue-tsc.

## Global Constraints

- Keep the product focused on Deang sour tea; do not add generic tea-culture sections.
- Use one Vue application with separate public, user, merchant, and admin layouts.
- Support `demo` and `hybrid` modes; never silently swallow API failures.
- Label simulated payment, local accounts, and unsupported backend features as demo behavior.
- Preserve the user's uncommitted `AGENTS.md` change and avoid unrelated document edits.
- Use original bitmap visual assets; list authoritative cultural sources on content pages.
- Use Lucide icons for controls, card radius no greater than 8px, and no nested cards.
- Validate at `1440x900`, `768x1024`, and `390x844` without overlap or horizontal overflow.
- Every task follows red-green-refactor, runs its listed checks, commits only its scope, and pushes verified commits.

---

## File Map

```text
frontend/
  package.json                     scripts and dependencies
  vite.config.ts                   Vite and Vitest configuration
  tsconfig.json                    strict TypeScript configuration
  eslint.config.js                 Vue/TypeScript lint rules
  playwright.config.ts             desktop/tablet/mobile projects
  index.html                       Vite application shell
  public/images/                   original hero, craft, story, and product imagery
  src/main.ts                      application bootstrap
  src/App.vue                      router outlet and global mode banner
  src/router/index.ts              route records and role guards
  src/domain/types.ts              stable domain types
  src/domain/stateMachines.ts      valid state transitions
  src/data/repository.ts           repository contracts and gateway
  src/data/demoRepository.ts       versioned local demo implementation
  src/data/apiRepository.ts        Spring Boot adapter
  src/data/seed.ts                 deterministic defense-demo fixture
  src/stores/                      Pinia stores by business capability
  src/layouts/                     public, account, merchant, admin layouts
  src/pages/                       route-level pages grouped by capability
  src/components/                  reusable culture, commerce, order, and common UI
  src/styles/                      tokens, base, public, and workspace styling
  src/utils/                       money, validation, identifiers, and dates
  src/tests/                       unit/component tests and test setup
  e2e/                             Playwright user, merchant, admin, and responsive tests
```

## Task 1: Establish the Vue Application Baseline

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/eslint.config.js`
- Replace: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/base.css`
- Create: `frontend/src/tests/setup.ts`
- Create: `frontend/src/tests/App.spec.ts`
- Remove after replacement is verified: `frontend/app.js`, `frontend/styles.css`

**Interfaces:**
- Produces: Vite entry `src/main.ts`, application root `App.vue`, test environment using `jsdom`.

- [ ] **Step 1: Create package and tool configuration**

Use these scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "typecheck": "vue-tsc -b --force",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

Install runtime packages `vue`, `vue-router`, `pinia`, `axios`, `element-plus`, `lucide-vue-next`, and `echarts`. Install development packages `vite`, `typescript`, `vue-tsc`, `@vitejs/plugin-vue`, `vitest`, `jsdom`, `@vue/test-utils`, `@playwright/test`, `eslint`, `@eslint/js`, `eslint-plugin-vue`, `typescript-eslint`, and `prettier`.

- [ ] **Step 2: Install dependencies and create the lockfile**

Run: `cd frontend && npm install`

Expected: exit 0 and `frontend/package-lock.json` exists.

- [ ] **Step 3: Write the failing application smoke test**

```ts
import { mount } from '@vue/test-utils'
import App from '../App.vue'

it('renders the Deang sour tea product identity', () => {
  expect(mount(App).text()).toContain('德昂族酸茶')
})
```

- [ ] **Step 4: Run the test and verify red**

Run: `npm test -- src/tests/App.spec.ts`

Expected: FAIL because `App.vue` does not yet expose the product identity.

- [ ] **Step 5: Bootstrap Vue and satisfy the test**

`main.ts` must create Vue, install Pinia and Router, import Element Plus plus `tokens.css` and `base.css`, then mount `App`. `App.vue` initially renders the text `德昂族酸茶` and `<RouterView />`.

- [ ] **Step 6: Verify and commit**

Run: `npm test -- src/tests/App.spec.ts && npm run typecheck && npm run build`

Expected: all commands exit 0 and `frontend/dist/index.html` exists.

Commit: `git commit -m "Migrate frontend to Vue and Vite"`

## Task 2: Define Domain Types, State Machines, and Utilities

**Files:**
- Create: `frontend/src/domain/types.ts`
- Create: `frontend/src/domain/stateMachines.ts`
- Create: `frontend/src/utils/money.ts`
- Create: `frontend/src/utils/validation.ts`
- Create: `frontend/src/utils/identifiers.ts`
- Create: `frontend/src/tests/domain/stateMachines.spec.ts`
- Create: `frontend/src/tests/utils/money.spec.ts`

**Interfaces:**
- Produces: `Role`, `User`, `MerchantApplication`, `Product`, `CartLine`, `Order`, `AfterSale`, `Booking`, `ContentArticle`, and `JourneyPoster` types.
- Produces: `transitionOrder`, `transitionProduct`, `transitionAfterSale`, `transitionBooking`, `calculateCartTotal`, `isValidPhone`, and `createBusinessId`.

- [ ] **Step 1: Write failing money and transition tests**

```ts
expect(calculateCartTotal([{ unitPriceCents: 5900, quantity: 2 }])).toBe(11800)
expect(transitionOrder('PENDING_PAYMENT', 'PAY_SUCCESS')).toBe('PAID')
expect(() => transitionOrder('PENDING_PAYMENT', 'SHIP')).toThrow('非法订单状态转换')
```

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/domain src/tests/utils`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement exact domain unions**

```ts
export type Role = 'GUEST' | 'USER' | 'MERCHANT' | 'ADMIN'
export type MerchantStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type ProductStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'OFF_SHELF'
export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | 'AFTER_SALE_REQUESTED'
export type AfterSaleStatus = 'REQUESTED' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CLOSED'
export type BookingStatus = 'PENDING' | 'VERIFIED' | 'CANCELLED'

export interface User { id: string; username: string; displayName: string; phone: string; role: Exclude<Role, 'GUEST'>; merchantStatus: MerchantStatus; merchantId?: string }
export interface MerchantApplication { id: string; userId: string; shopName: string; contact: string; location: string; introduction: string; status: Exclude<MerchantStatus, 'NONE'>; reviewReason?: string; createdAt: string }
export interface ContentSource { title: string; publisher: string; url: string; claim: string }
export interface ContentArticle { id: string; slug: string; title: string; category: string; summary: string; body: string; cover: string; sources: ContentSource[]; published: boolean }
export interface Product { id: string; merchantId: string; name: string; category: string; priceCents: number; stock: number; sales: number; description: string; image: string; status: ProductStatus; reviewReason?: string }
export interface CartLine { productId: string; quantity: number; unitPriceCents: number }
export interface OrderLine extends CartLine { productName: string; image: string }
export interface TimelineEvent { status: string; label: string; at: string; note?: string }
export interface Order { id: string; orderNo: string; userId: string; merchantId: string; lines: OrderLine[]; totalCents: number; status: OrderStatus; contact: OrderContact; timeline: TimelineEvent[]; createdAt: string }
export interface AfterSale { id: string; orderId: string; userId: string; merchantId: string; reason: string; status: AfterSaleStatus; resolutionNote?: string; timeline: TimelineEvent[] }
export interface Booking { id: string; userId: string; date: string; people: number; phone: string; posterId?: string; code: string; status: BookingStatus; createdAt: string }
export interface JourneyChoice { stepId: string; optionId: string; trait: 'PURE' | 'FRESH' | 'WARM' }
export interface JourneyRecipe { id: string; name: '本真原味' | '山野清新' | '温润花香'; ingredients: string[]; description: string }
export interface JourneyPoster { id: string; userId?: string; recipe: JourneyRecipe; code: string; createdAt: string }
export interface Actor { userId: string; role: Exclude<Role, 'GUEST'>; merchantId?: string }
export interface LoginInput { username: string; password: string }
export interface RegisterInput extends LoginInput { phone: string; displayName?: string }
export interface AuthSession { sessionId: string; user: User }
export interface ProductQuery { keyword?: string; category?: string; inStock?: boolean; sort?: 'PRICE_ASC' | 'PRICE_DESC' }
export interface OrderContact { recipient: string; phone: string; address: string }
export interface BookingInput { date: string; people: number; phone: string; posterId?: string }
export interface MerchantApplicationInput { shopName: string; contact: string; location: string; introduction: string }
export interface ReviewDecision { result: 'APPROVE' | 'REJECT'; reason?: string }
export interface ProductDraftInput { id?: string; name: string; category: string; priceCents: number; stock: number; description: string; image: string }
export interface ContentInput { id?: string; title: string; slug: string; category: string; summary: string; body: string; sources: ContentSource[]; published: boolean }
export interface DashboardMetrics { revenueCents: number; orderCount: number; productCount: number; bookingCount: number; afterSaleCount: number }
```

Use integer cents internally for totals. `transition*` functions use explicit event maps and throw `DomainTransitionError` for invalid transitions.

- [ ] **Step 4: Verify green**

Run: `npm test -- src/tests/domain src/tests/utils`

Expected: PASS for valid transitions, invalid transitions, zero cart, and quantity multiplication.

- [ ] **Step 5: Commit**

Commit: `git commit -m "Add frontend domain state machines"`

## Task 3: Build the Versioned Demo Repository

**Files:**
- Create: `frontend/src/data/repository.ts`
- Create: `frontend/src/data/demoRepository.ts`
- Create: `frontend/src/data/seed.ts`
- Create: `frontend/src/tests/data/demoRepository.spec.ts`

**Interfaces:**
- Produces: `PlatformRepository` with `login`, `register`, `listProducts`, `saveCart`, `createOrder`, `payOrder`, `shipOrder`, `receiveOrder`, `requestAfterSale`, `resolveAfterSale`, `createBooking`, `verifyBooking`, `applyMerchant`, `reviewMerchant`, `saveProduct`, `reviewProduct`, `listContents`, and `reset`.
- Produces: `createDemoRepository(storage: Storage): PlatformRepository`.

Use this contract throughout later tasks:

```ts
export interface PlatformRepository {
  login(input: LoginInput): Promise<AuthSession>
  register(input: RegisterInput): Promise<AuthSession>
  getUser(userId: string): Promise<User>
  listProducts(query?: ProductQuery): Promise<Product[]>
  getProduct(productId: string): Promise<Product>
  listContents(): Promise<ContentArticle[]>
  getContent(slug: string): Promise<ContentArticle>
  getCart(userId: string): Promise<CartLine[]>
  saveCart(userId: string, lines: CartLine[]): Promise<CartLine[]>
  createOrder(userId: string, lines: CartLine[], contact: OrderContact): Promise<Order>
  listOrders(actor: Actor): Promise<Order[]>
  getOrder(actor: Actor, orderId: string): Promise<Order>
  payOrder(orderId: string, result: 'SUCCESS' | 'FAILURE' | 'CANCEL'): Promise<Order>
  shipOrder(actor: Actor, orderId: string): Promise<Order>
  receiveOrder(actor: Actor, orderId: string): Promise<Order>
  listAfterSales(actor: Actor): Promise<AfterSale[]>
  requestAfterSale(actor: Actor, orderId: string, reason: string): Promise<AfterSale>
  resolveAfterSale(actor: Actor, afterSaleId: string, decision: 'APPROVE' | 'REJECT', note: string): Promise<AfterSale>
  listBookings(actor: Actor): Promise<Booking[]>
  createBooking(actor: Actor, input: BookingInput): Promise<Booking>
  cancelBooking(actor: Actor, bookingId: string): Promise<Booking>
  verifyBooking(actor: Actor, code: string): Promise<Booking>
  getMerchantApplication(userId: string): Promise<MerchantApplication | null>
  applyMerchant(userId: string, input: MerchantApplicationInput): Promise<MerchantApplication>
  listMerchantApplications(actor: Actor): Promise<MerchantApplication[]>
  reviewMerchant(actor: Actor, applicationId: string, decision: ReviewDecision): Promise<MerchantApplication>
  saveProduct(actor: Actor, input: ProductDraftInput): Promise<Product>
  submitProduct(actor: Actor, productId: string): Promise<Product>
  reviewProduct(actor: Actor, productId: string, decision: ReviewDecision): Promise<Product>
  saveContent(actor: Actor, input: ContentInput): Promise<ContentArticle>
  dashboard(actor: Actor): Promise<DashboardMetrics>
  reset(): Promise<void>
}
```

- [ ] **Step 1: Write failing repository lifecycle tests**

Use an in-memory `Storage` fake and assert this exact chain:

```ts
const user = await repo.register({ username: 'new-user', password: 'Demo123!', phone: '13800138000' })
const order = await repo.createOrder(user.id, [{ productId: 'product-tasting', quantity: 2 }])
expect(order.status).toBe('PENDING_PAYMENT')
expect((await repo.payOrder(order.id, 'SUCCESS')).status).toBe('PAID')
```

Add tests for duplicate username rejection, stock shortage, merchant ownership, repeated payment, invalid role action, and reset restoring seed version.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/data/demoRepository.spec.ts`

Expected: FAIL because `createDemoRepository` is absent.

- [ ] **Step 3: Implement deterministic seed data**

Seed three accounts with password `Demo123!`: `user_demo`, `merchant_demo`, and `admin_demo`. Include two approved products, one pending merchant product, two culture articles, one pending merchant application, one pending booking, one SHIPPED order owned by `user_demo` for receipt demonstration, and a second order with a REQUESTED after-sale for merchant handling. Store data under `deang-sour-tea:v2` with `{ version: 2, data }`.

- [ ] **Step 4: Implement repository invariants**

Clone data at repository boundaries, validate resource ownership on merchant methods, decrement stock only on first successful payment, and append a timestamped event for every order or after-sale transition. Persist after every mutation.

- [ ] **Step 5: Verify green and commit**

Run: `npm test -- src/tests/data/demoRepository.spec.ts`

Expected: all lifecycle and invariant tests pass.

Commit: `git commit -m "Add offline demo repository"`

## Task 4: Implement Authentication, Routing, and Layouts

**Files:**
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/stores/app.ts`
- Create: `frontend/src/stores/auth.ts`
- Create: `frontend/src/layouts/PublicLayout.vue`
- Create: `frontend/src/layouts/AccountLayout.vue`
- Create: `frontend/src/layouts/WorkspaceLayout.vue`
- Create: `frontend/src/components/common/AppHeader.vue`
- Create: `frontend/src/components/common/ModeBanner.vue`
- Create: `frontend/src/pages/auth/LoginPage.vue`
- Create: `frontend/src/pages/auth/RegisterPage.vue`
- Create: `frontend/src/pages/system/ForbiddenPage.vue`
- Create: `frontend/src/pages/system/NotFoundPage.vue`
- Create: `frontend/src/tests/router/guards.spec.ts`
- Create: `frontend/src/tests/auth/LoginPage.spec.ts`

**Interfaces:**
- Consumes: `PlatformRepository.login/register` from Task 3.
- Produces: route meta `{ requiresAuth?: boolean; roles?: Role[]; merchantApproved?: boolean }` and `authStore.canAccess(route)`.

- [ ] **Step 1: Write failing route guard tests**

Assert guest `/checkout` redirects to `/login?redirect=/checkout`, USER `/admin` resolves to `/403`, pending merchant `/merchant` resolves to `/merchant/apply`, and ADMIN `/admin` is allowed.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/router src/tests/auth`

Expected: FAIL because router and auth store are absent.

- [ ] **Step 3: Implement auth persistence and route guards**

Persist only `{ userId, sessionId }` under `deang-sour-tea:session`. Rehydrate the account through the repository. After login, replace to the validated `redirect` route; reject external URLs and values not starting with `/`.

- [ ] **Step 4: Implement layouts and navigation**

Public layout exposes 首页、酸茶文化、制作技艺、传承故事、互动体验、酸茶商城 and 预约体验. Account layout exposes user records. Workspace layout accepts `kind: 'merchant' | 'admin'` and renders separate side navigation. Mobile navigation uses a drawer and icon buttons with labels/tooltips.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/tests/router src/tests/auth && npm run typecheck`

Expected: all guard and redirect tests pass.

Commit: `git commit -m "Add role-aware frontend navigation"`

## Task 5: Build the Public Culture Experience and Visual Assets

**Files:**
- Create: `frontend/public/images/hero-sour-tea.webp`
- Create: `frontend/public/images/craft-fire.webp`
- Create: `frontend/public/images/craft-fermentation.webp`
- Create: `frontend/public/images/artisan-story.webp`
- Create: `frontend/public/images/product-gift.webp`
- Create: `frontend/public/images/product-tasting.webp`
- Create: `frontend/src/styles/public.css`
- Create: `frontend/src/pages/public/HomePage.vue`
- Create: `frontend/src/pages/public/CultureIndexPage.vue`
- Create: `frontend/src/pages/public/CultureDetailPage.vue`
- Create: `frontend/src/pages/public/CraftPage.vue`
- Create: `frontend/src/pages/public/StoriesPage.vue`
- Create: `frontend/src/components/culture/CraftTimeline.vue`
- Create: `frontend/src/components/culture/SourceList.vue`
- Create: `frontend/src/tests/public/HomePage.spec.ts`
- Create: `frontend/src/tests/public/SourceList.spec.ts`

**Interfaces:**
- Consumes: `ContentArticle` and repository content methods.
- Produces: public route pages and `SourceList` accepting `{ title: string; publisher: string; url: string }[]`.

- [ ] **Step 1: Research and record authoritative sources**

Use primary government, recognized cultural-heritage, museum, or university sources. Record source title, publisher, direct URL, and the specific claim supported in `seed.ts`; do not use unsourced historical claims.

- [ ] **Step 2: Generate original bitmap assets**

Generate documentary-style, respectful images depicting Deang sour tea leaves, hand processing, fire heating, bamboo-container fermentation, and inspectable product packs. Avoid invented ceremonial clothing details, text baked into images, dark blur, stock-photo staging, and generic Chinese tea-house imagery. Convert outputs to WebP at a maximum long edge of 1920px and keep each file below 500KB where practical.

- [ ] **Step 3: Write failing content tests**

Assert the homepage H1 is `德昂族酸茶`, the first viewport contains a primary journey action, culture detail renders at least one direct source link, and all content images have non-empty alt text.

- [ ] **Step 4: Verify red, implement, and verify green**

Run before implementation: `npm test -- src/tests/public`

Expected: FAIL because pages are absent.

Implement full-width narrative sections, craft timeline, story list, and source list. Then rerun the command and expect PASS.

- [ ] **Step 5: Commit**

Commit: `git commit -m "Build Deang sour tea culture experience"`

## Task 6: Implement the Tea Journey and Poster

**Files:**
- Create: `frontend/src/pages/journey/JourneyPage.vue`
- Create: `frontend/src/components/journey/JourneyStep.vue`
- Create: `frontend/src/components/journey/RecipePoster.vue`
- Create: `frontend/src/stores/journey.ts`
- Create: `frontend/src/tests/journey/JourneyPage.spec.ts`
- Create: `frontend/src/tests/journey/recipe.spec.ts`

**Interfaces:**
- Produces: `buildRecipe(choices: JourneyChoice[]): JourneyRecipe` and `journeyStore.savePoster(): JourneyPoster`.
- Consumes: authenticated user when saving; guests may complete the journey and are prompted to log in before persistence.

- [ ] **Step 1: Write failing recipe and interaction tests**

Assert three choices deterministically yield one of `本真原味`, `山野清新`, or `温润花香`; next is disabled before selection; completion renders recipe ingredients and a `TEA-` prefixed code.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/journey`

Expected: FAIL because journey modules are absent.

- [ ] **Step 3: Implement the finite three-step journey**

Each step has one selected option, Back preserves earlier choices, Restart clears all choices, and Save is idempotent for a completed run. The poster renders a visual recipe, creation date, user display name when available, and a code suitable for booking association.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/tests/journey && npm run typecheck`

Expected: all tests pass.

Commit: `git commit -m "Add interactive sour tea journey"`

## Task 7: Complete Shop, Cart, Checkout, and Simulated Payment

**Files:**
- Create: `frontend/src/stores/catalog.ts`
- Create: `frontend/src/stores/cart.ts`
- Create: `frontend/src/stores/orders.ts`
- Create: `frontend/src/pages/shop/ShopPage.vue`
- Create: `frontend/src/pages/shop/ProductDetailPage.vue`
- Create: `frontend/src/pages/shop/CartPage.vue`
- Create: `frontend/src/pages/shop/CheckoutPage.vue`
- Create: `frontend/src/pages/shop/PaymentPage.vue`
- Create: `frontend/src/components/shop/ProductCard.vue`
- Create: `frontend/src/components/shop/QuantityStepper.vue`
- Create: `frontend/src/components/orders/OrderTimeline.vue`
- Create: `frontend/src/components/payment/PaymentPanel.vue`
- Create: `frontend/src/tests/shop/cart.spec.ts`
- Create: `frontend/src/tests/shop/checkout.spec.ts`
- Create: `frontend/src/tests/shop/payment.spec.ts`

**Interfaces:**
- Consumes: product and order repository methods.
- Produces: `cartStore.add(productId, quantity)`, `cartStore.setQuantity`, `ordersStore.checkout`, and `ordersStore.pay(orderId, result)`.

- [ ] **Step 1: Write failing cart and payment tests**

Assert duplicate adds merge quantities, quantity cannot exceed stock, totals use cents, checkout requires login and contact data, payment failure preserves `PENDING_PAYMENT`, and repeated success does not double-decrement stock.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/shop`

Expected: FAIL because stores and pages are absent.

- [ ] **Step 3: Implement catalog and cart UX**

Shop supports category, keyword, price sort, in-stock filter, reset, and empty result. Product detail exposes inspectable images, price, stock, merchant, quantity stepper, Add to cart, and Buy now. Cart supports update, remove, clear, subtotal, and disabled checkout when invalid.

- [ ] **Step 4: Implement checkout and payment UX**

Checkout validates recipient, 11-digit phone, and address. Create the order before entering payment. Payment page explicitly labels simulation and offers 成功、失败、取消; request state disables all result controls. Success routes to order detail, failure offers retry, and cancel returns to the unpaid order.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/tests/shop && npm run typecheck`

Expected: all cart, stock, checkout, and idempotency tests pass.

Commit: `git commit -m "Complete simulated commerce flow"`

## Task 8: Complete User Center, Booking, and After-Sales

**Files:**
- Create: `frontend/src/stores/bookings.ts`
- Create: `frontend/src/stores/afterSales.ts`
- Create: `frontend/src/pages/account/AccountOverviewPage.vue`
- Create: `frontend/src/pages/account/OrdersPage.vue`
- Create: `frontend/src/pages/account/OrderDetailPage.vue`
- Create: `frontend/src/pages/account/BookingsPage.vue`
- Create: `frontend/src/pages/account/PostersPage.vue`
- Create: `frontend/src/pages/account/AfterSalesPage.vue`
- Create: `frontend/src/pages/booking/BookingPage.vue`
- Create: `frontend/src/components/booking/BookingForm.vue`
- Create: `frontend/src/components/afterSales/AfterSaleForm.vue`
- Create: `frontend/src/tests/account/orderActions.spec.ts`
- Create: `frontend/src/tests/booking/booking.spec.ts`

**Interfaces:**
- Produces: `bookingsStore.create/cancel`, `afterSalesStore.request`, and order receive actions.
- Consumes: user-owned repository queries; never display another user's records.

- [ ] **Step 1: Write failing user lifecycle tests**

Assert only SHIPPED orders can be received, only paid/shipped/received orders can request after-sale, future booking date is required, one code cannot be verified twice, and user lists are ownership-filtered.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/account src/tests/booking`

Expected: FAIL because account and booking modules are absent.

- [ ] **Step 3: Implement account pages and actions**

Order detail shows products, totals, address, payment label, timeline, receive action, and after-sale entry. Booking form accepts future date, 1-12 people, phone, and optional saved poster; success shows a copyable verify code. Empty states link back to Shop, Journey, or Booking.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/tests/account src/tests/booking && npm run typecheck`

Expected: all tests pass.

Commit: `git commit -m "Add complete user account workflows"`

## Task 9: Build Merchant Application and Workspace

**Files:**
- Create: `frontend/src/stores/merchant.ts`
- Create: `frontend/src/pages/merchant/MerchantApplyPage.vue`
- Create: `frontend/src/pages/merchant/MerchantDashboardPage.vue`
- Create: `frontend/src/pages/merchant/MerchantProductsPage.vue`
- Create: `frontend/src/pages/merchant/MerchantProductEditPage.vue`
- Create: `frontend/src/pages/merchant/MerchantOrdersPage.vue`
- Create: `frontend/src/pages/merchant/MerchantAfterSalesPage.vue`
- Create: `frontend/src/components/workspace/MetricStrip.vue`
- Create: `frontend/src/components/workspace/FilterBar.vue`
- Create: `frontend/src/tests/merchant/merchantWorkspace.spec.ts`

**Interfaces:**
- Consumes: ownership-aware merchant repository methods.
- Produces: merchant application, product draft/submit, order ship, and after-sale resolve actions.

- [ ] **Step 1: Write failing permission and workflow tests**

Assert a USER can submit one application, PENDING cannot access workspace, APPROVED can create a draft and submit it, merchant sees only own orders, only PAID order can ship, and repeated shipping is rejected.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/merchant`

Expected: FAIL because merchant modules are absent.

- [ ] **Step 3: Implement merchant workflow**

Application requires shop name, contact, location, introduction, and agreement confirmation. Dashboard shows revenue, paid orders, pending shipments, product status distribution, and after-sale count. Product form validates name, category, positive price, stock, description, and image. Tables include filters, empty states, pagination, and responsive list fallback.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/tests/merchant && npm run typecheck`

Expected: all role, ownership, and state tests pass.

Commit: `git commit -m "Build merchant application workspace"`

## Task 10: Build the Administration Workspace

**Files:**
- Create: `frontend/src/stores/admin.ts`
- Create: `frontend/src/pages/admin/AdminDashboardPage.vue`
- Create: `frontend/src/pages/admin/AdminMerchantsPage.vue`
- Create: `frontend/src/pages/admin/AdminProductsPage.vue`
- Create: `frontend/src/pages/admin/AdminContentsPage.vue`
- Create: `frontend/src/pages/admin/AdminBookingsPage.vue`
- Create: `frontend/src/components/admin/ReviewDialog.vue`
- Create: `frontend/src/components/admin/VerifyCodePanel.vue`
- Create: `frontend/src/tests/admin/reviewFlows.spec.ts`
- Create: `frontend/src/tests/admin/verifyBooking.spec.ts`

**Interfaces:**
- Consumes: admin repository review, content, dashboard, and booking methods.
- Produces: review decisions with required rejection reason and idempotent booking verification.

- [ ] **Step 1: Write failing admin tests**

Assert only ADMIN can review, approval changes PENDING merchant/product to APPROVED, rejection requires a reason, already reviewed entries cannot be reviewed again, and invalid or used verify code returns a visible domain error.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/admin`

Expected: FAIL because admin modules are absent.

- [ ] **Step 3: Implement admin pages**

Dashboard uses ECharts for order trend and product status distribution with numeric fallback text. Review pages provide status filters, applicant/product detail drawer, approve/reject dialog, and result feedback. Content management supports create, edit, publish, unpublish, source metadata, and a public preview. Booking page supports code input and table action.

- [ ] **Step 4: Verify and commit**

Run: `npm test -- src/tests/admin && npm run typecheck`

Expected: all admin role and idempotency tests pass.

Commit: `git commit -m "Build platform administration workspace"`

## Task 11: Add the Spring Boot API Adapter and Mode Gateway

**Files:**
- Create: `frontend/src/data/apiClient.ts`
- Create: `frontend/src/data/apiRepository.ts`
- Modify: `frontend/src/data/repository.ts`
- Modify: `frontend/src/stores/app.ts`
- Create: `frontend/src/components/common/ModeSwitcher.vue`
- Create: `frontend/src/tests/data/apiRepository.spec.ts`
- Create: `frontend/src/tests/data/repositoryGateway.spec.ts`

**Interfaces:**
- Produces: `createApiRepository(client)`, `createRepositoryGateway({ api, demo })`, mode `'demo' | 'hybrid'`, and capability metadata.
- Consumes: backend envelope `{ code: number; message: string; data: T }` and existing endpoint shapes.

```ts
import type { Ref } from 'vue'

export type RepositoryCapability =
  | 'auth'
  | 'catalog'
  | 'content'
  | 'orders'
  | 'bookings'
  | 'merchantReview'
  | 'productReview'
  | 'dashboard'
  | 'payment'
  | 'receipt'
  | 'afterSales'

export interface RepositoryGateway {
  mode: Readonly<Ref<'demo' | 'hybrid'>>
  capabilities: Readonly<Ref<Record<RepositoryCapability, 'api' | 'demo'>>>
  repository: PlatformRepository
  detectApi(): Promise<'demo' | 'hybrid'>
  switchToDemo(confirmed: boolean): Promise<void>
}
```

- [ ] **Step 1: Write failing adapter tests with mocked Axios**

Assert product `totalAmount`/order `orderNo` fields normalize to frontend names, nonzero API code throws `ApiBusinessError`, timeout raises `ApiUnavailableError`, and gateway requires confirmation before switching from hybrid to demo.

- [ ] **Step 2: Verify red**

Run: `npm test -- src/tests/data/apiRepository.spec.ts src/tests/data/repositoryGateway.spec.ts`

Expected: FAIL because API modules are absent.

- [ ] **Step 3: Implement supported endpoint mapping**

Map login, contents, products, merchants, orders, bookings, reviews, shipping, verification, and dashboard. Use `VITE_API_BASE_URL` with default `http://localhost:8080/api`, an 8-second timeout, bearer token interceptor, and one response-envelope parser.

- [ ] **Step 4: Implement explicit hybrid behavior**

Health check at startup selects hybrid only after a successful public product request. Hybrid mode uses API for supported capabilities and demo storage for registration, merchant application details, payment outcomes, receipt, and after-sales. The persistent banner reads `API 已连接 · 部分闭环为演示数据`; full demo reads `离线演示模式`.

- [ ] **Step 5: Verify and commit**

Run: `npm test -- src/tests/data && npm run typecheck`

Expected: all adapter, normalization, timeout, and mode tests pass.

Commit: `git commit -m "Connect Vue frontend to Spring Boot API"`

## Task 12: Complete Responsive, Accessibility, and Visual QA

**Files:**
- Create: `frontend/src/styles/workspace.css`
- Create: `frontend/src/components/common/AppEmpty.vue`
- Create: `frontend/src/components/common/AppError.vue`
- Create: `frontend/src/components/common/AppSkeleton.vue`
- Modify: all route pages with final responsive and accessibility behavior
- Create: `frontend/e2e/responsive.spec.ts`
- Create: `frontend/e2e/accessibility.spec.ts`

**Interfaces:**
- Produces: stable responsive layouts and common loading, empty, and error states.

- [ ] **Step 1: Configure Playwright viewports and write failing checks**

Create projects `desktop` at `1440x900`, `tablet` at `768x1024`, and `mobile` at `390x844`. Assert `document.documentElement.scrollWidth <= window.innerWidth`, the H1 is visible, mobile drawer opens, and every route has exactly one main landmark.

- [ ] **Step 2: Verify red**

Run: `npm run dev -- --host 127.0.0.1` in one session, then `npm run test:e2e -- e2e/responsive.spec.ts e2e/accessibility.spec.ts`.

Expected: at least one failure before responsive styling is complete.

- [ ] **Step 3: Implement responsive and accessibility corrections**

Use stable grid tracks, fixed icon-button dimensions, 44px mobile targets, visible focus rings, semantic headings, labels, alt text, and table-to-list fallback below 720px. Keep hero content within the viewport while revealing the next section. Disable nonfunctional controls instead of rendering dead buttons.

- [ ] **Step 4: Capture and inspect screenshots**

Capture homepage, shop, checkout, account order, merchant dashboard, and admin review at all three viewports. Inspect image dimensions and visible content; correct overlap, clipping, weak contrast, blank images, and layout shifts.

- [ ] **Step 5: Verify and commit**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e -- e2e/responsive.spec.ts e2e/accessibility.spec.ts`

Expected: all commands exit 0.

Commit: `git commit -m "Polish responsive frontend experience"`

## Task 13: Run Complete End-to-End Flows and Update Delivery Docs

**Files:**
- Create: `frontend/e2e/user-flow.spec.ts`
- Create: `frontend/e2e/merchant-flow.spec.ts`
- Create: `frontend/e2e/admin-flow.spec.ts`
- Create: `frontend/e2e/full-lifecycle.spec.ts`
- Modify: `README.md`
- Modify: `docs/demo-checklist.md`
- Modify: `docs/final-submission-checklist.md`

**Interfaces:**
- Consumes: all completed routes and seeded accounts.
- Produces: repeatable defense workflow and exact run instructions.

- [ ] **Step 1: Write the complete failing E2E scenarios**

User scenario: register, complete journey, save poster, add product, checkout, fail payment, retry success, and create a booking. A separate `user_demo` assertion receives the seeded SHIPPED order and opens an after-sale request.

Merchant scenario: log in as `merchant_demo`, create and submit product, ship a paid own order, and approve a requested after-sale.

Admin scenario: log in as `admin_demo`, approve pending merchant, approve pending product, publish content with source metadata, and verify a booking code.

Full lifecycle scenario: reset seed; log in as user and create/pay an order; log in as merchant and ship it; log back in as user to receive and request after-sale; log in as merchant to approve and complete simulated refund; create a booking as user; log in as admin to verify its code. Assert each timeline contains every expected state exactly once.

- [ ] **Step 2: Run and correct only observed failures**

Run: `npm run test:e2e -- e2e/user-flow.spec.ts e2e/merchant-flow.spec.ts e2e/admin-flow.spec.ts e2e/full-lifecycle.spec.ts`

Expected: all scenarios pass from a reset seed. For each failure, use systematic debugging, add the narrowest regression assertion, then rerun the affected file.

- [ ] **Step 3: Update documentation**

README must contain Node requirements, `npm install`, `npm run dev`, `npm test`, `npm run test:e2e`, demo credentials, mode meanings, backend URL override, and production build command. Demo checklist must list the three exact role scenarios. Final submission checklist must include screenshots, source citations, test output, and the generated `dist` verification.

- [ ] **Step 4: Run the final verification gate**

```bash
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: zero lint errors, zero type errors, all unit/component/E2E tests pass, and production build exits 0.

- [ ] **Step 5: Browser acceptance and final commit**

Start Vite on an available local port, open the application in Chrome, complete one public-to-payment flow, and inspect desktop plus mobile screenshots. Stop all temporary servers after verification.

Commit: `git commit -m "Deliver final interactive frontend"`

Push the implementation branch and open a ready-for-review pull request against `main`, or merge only after all checks above remain green.
