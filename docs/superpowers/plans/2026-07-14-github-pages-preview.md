# GitHub Pages Online Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the Vue 3 frontend as a reliable GitHub Pages project site at `https://15717082411.github.io/deang-sour-tea-platform/` without changing local development behavior.

**Architecture:** Vite receives the project-site base path from the deployment environment, while Vue Router and a centralized asset resolver consume that base. A static-demo build flag skips API probing on Pages. GitHub Actions verifies the frontend, creates the SPA fallback, and deploys the generated artifact.

**Tech Stack:** Vue 3, TypeScript, Vite 6, Vue Router 4, Vitest, GitHub Actions, GitHub Pages

## Global Constraints

- The public URL is `https://15717082411.github.io/deang-sour-tea-platform/`.
- GitHub Pages is a static interactive demo, not a production ecommerce backend.
- Pages builds use browser-local demo data and must not request `http://localhost:8080/api`.
- Local development retains the existing Spring Boot API detection and hybrid content mode.
- Vue Router keeps History mode; direct route refreshes use a generated `404.html` fallback.
- Business data stores canonical `/images/...` paths; deployment prefixes are applied only when rendering.
- `dist/` remains generated and untracked.
- Every production-code behavior change follows RED, GREEN, REFACTOR.
- Verified changes are committed and pushed to GitHub.

---

### Task 1: Deployment Runtime Configuration

**Files:**
- Create: `frontend/src/config/runtime.ts`
- Create: `frontend/src/tests/config/runtime.spec.ts`
- Modify: `frontend/src/main.ts`
- Modify: `frontend/src/router/index.ts`
- Modify: `frontend/vite.config.ts`

**Interfaces:**
- Produces: `initializeRepositoryMode(detectApi, staticDemo?) => Promise<void>`
- Produces: `VITE_BASE_PATH` as the Vite deployment-base input.
- Consumes: the existing `appStore.detectApi()` callback and Vite `import.meta.env` values.

- [ ] **Step 1: Write the failing runtime-mode tests**

```ts
import { describe, expect, it, vi } from 'vitest'
import { initializeRepositoryMode } from '../../config/runtime'

describe('initializeRepositoryMode', () => {
  it('skips API detection for a static demo build', async () => {
    const detectApi = vi.fn().mockResolvedValue('hybrid')
    await initializeRepositoryMode(detectApi, 'true')
    expect(detectApi).not.toHaveBeenCalled()
  })

  it('keeps API detection for local development', async () => {
    const detectApi = vi.fn().mockResolvedValue('demo')
    await initializeRepositoryMode(detectApi, undefined)
    expect(detectApi).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cd frontend && npm test -- src/tests/config/runtime.spec.ts`

Expected: FAIL because `../../config/runtime` does not exist.

- [ ] **Step 3: Implement the minimum runtime initializer**

```ts
type DetectApi = () => Promise<unknown>

export async function initializeRepositoryMode(
  detectApi: DetectApi,
  staticDemo = import.meta.env.VITE_STATIC_DEMO,
): Promise<void> {
  if (staticDemo === 'true') return
  await detectApi()
}
```

Change `main.ts` to call `initializeRepositoryMode(() => appStore.detectApi())`. Configure `vite.config.ts` with `base: process.env.VITE_BASE_PATH ?? '/'`. Change Router creation to `createWebHistory(import.meta.env.BASE_URL)`.

- [ ] **Step 4: Verify GREEN and deployment-base compilation**

Run: `cd frontend && npm test -- src/tests/config/runtime.spec.ts`

Expected: 2 tests pass.

Run: `cd frontend && VITE_BASE_PATH=/deang-sour-tea-platform/ VITE_STATIC_DEMO=true npm run build`

Expected: build succeeds and `dist/index.html` references `/deang-sour-tea-platform/assets/`.

- [ ] **Step 5: Run affected regression checks**

Run: `cd frontend && npm test -- src/tests/router src/tests/data/repositoryGateway.spec.ts`

Expected: all selected tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/config/runtime.ts frontend/src/tests/config/runtime.spec.ts frontend/src/main.ts frontend/src/router/index.ts frontend/vite.config.ts
git commit -m "feat: configure frontend for static preview builds"
```

---

### Task 2: Base-Aware Public Asset Rendering

**Files:**
- Create: `frontend/src/utils/assetUrl.ts`
- Create: `frontend/src/tests/utils/assetUrl.spec.ts`
- Modify: every Vue file whose dynamic image source comes from a product, order line, content article, preview form, or scripted timeline step.

**Interfaces:**
- Produces: `resolveAssetUrl(source: string, base?: string): string`.
- Consumes: canonical business-data paths and `import.meta.env.BASE_URL`.

- [ ] **Step 1: Write the failing asset resolver tests**

```ts
import { describe, expect, it } from 'vitest'
import { resolveAssetUrl } from '../../utils/assetUrl'

describe('resolveAssetUrl', () => {
  it('prefixes a root-relative public asset with the deployment base', () => {
    expect(resolveAssetUrl('/images/tea.webp', '/deang-sour-tea-platform/'))
      .toBe('/deang-sour-tea-platform/images/tea.webp')
  })

  it('keeps root deployment paths unchanged', () => {
    expect(resolveAssetUrl('/images/tea.webp', '/')).toBe('/images/tea.webp')
  })

  it('does not duplicate an existing deployment base', () => {
    expect(resolveAssetUrl('/deang-sour-tea-platform/images/tea.webp', '/deang-sour-tea-platform/'))
      .toBe('/deang-sour-tea-platform/images/tea.webp')
  })

  it.each(['https://cdn.example/tea.webp', 'data:image/png;base64,AA', 'blob:https://example/id'])
    ('keeps absolute source %s unchanged', (source) => {
      expect(resolveAssetUrl(source, '/deang-sour-tea-platform/')).toBe(source)
    })
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `cd frontend && npm test -- src/tests/utils/assetUrl.spec.ts`

Expected: FAIL because `../../utils/assetUrl` does not exist.

- [ ] **Step 3: Implement the pure resolver**

```ts
const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i

export function resolveAssetUrl(source: string, base = import.meta.env.BASE_URL): string {
  if (!source || ABSOLUTE_URL.test(source) || source.startsWith('//')) return source
  const normalizedBase = `/${base.replace(/^\/+|\/+$/g, '')}`.replace(/^\/$/, '') + '/'
  if (normalizedBase === '/' || source.startsWith(normalizedBase)) return source
  return `${normalizedBase}${source.replace(/^\/+/, '')}`
}
```

- [ ] **Step 4: Verify the resolver is GREEN**

Run: `cd frontend && npm test -- src/tests/utils/assetUrl.spec.ts`

Expected: all resolver cases pass.

- [ ] **Step 5: Apply the resolver at dynamic image render boundaries**

Import `resolveAssetUrl` and wrap dynamic image bindings in:

- `frontend/src/components/culture/CraftTimeline.vue`
- `frontend/src/components/shop/ProductCard.vue`
- `frontend/src/pages/account/OrderDetailPage.vue`
- `frontend/src/pages/account/OrdersPage.vue`
- `frontend/src/pages/account/OrderSummaryPage.vue`
- `frontend/src/pages/admin/AdminContentsPage.vue`
- `frontend/src/pages/admin/AdminProductsPage.vue`
- `frontend/src/pages/merchant/MerchantProductEditPage.vue`
- `frontend/src/pages/merchant/MerchantProductsPage.vue`
- `frontend/src/pages/public/CultureDetailPage.vue`
- `frontend/src/pages/public/CultureIndexPage.vue`
- `frontend/src/pages/public/HomePage.vue`
- `frontend/src/pages/shop/CartPage.vue`
- `frontend/src/pages/shop/CheckoutPage.vue`
- `frontend/src/pages/shop/ProductDetailPage.vue`

Example:

```vue
<img :src="resolveAssetUrl(product.image)" :alt="product.name" />
```

- [ ] **Step 6: Run focused component tests and a Pages-base build**

Run: `cd frontend && npm test -- src/tests/public src/tests/shop src/tests/account src/tests/merchant src/tests/admin`

Expected: all selected tests pass.

Run: `cd frontend && VITE_BASE_PATH=/deang-sour-tea-platform/ VITE_STATIC_DEMO=true npm run build`

Expected: build succeeds; rendered dynamic image paths use the Pages base through the resolver.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/assetUrl.ts frontend/src/tests/utils/assetUrl.spec.ts frontend/src/components frontend/src/pages
git commit -m "fix: resolve public assets under deployment base"
```

---

### Task 3: Reproducible Pages Artifact and Workflow

**Files:**
- Create: `frontend/scripts/prepare-pages-build.mjs`
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `frontend/package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `npm run build:pages`, which builds and validates `dist/index.html`, then writes an identical `dist/404.html`.
- Produces: a GitHub Pages deployment when verified code reaches `main`.
- Consumes: `VITE_BASE_PATH=/deang-sour-tea-platform/` and `VITE_STATIC_DEMO=true`.

- [ ] **Step 1: Add the Pages artifact preparation script**

Create a dependency-free Node script that:

1. Requires `VITE_BASE_PATH` to start and end with `/`.
2. Reads `dist/index.html` and confirms it contains `${VITE_BASE_PATH}assets/`.
3. Confirms `dist/images/hero-sour-tea.webp` exists.
4. Copies `index.html` to `404.html`.
5. Reads both files and throws unless their content is identical.

- [ ] **Step 2: Add and exercise the package command**

Add:

```json
"build:pages": "npm run build && node scripts/prepare-pages-build.mjs"
```

Run: `cd frontend && VITE_BASE_PATH=/deang-sour-tea-platform/ VITE_STATIC_DEMO=true npm run build:pages`

Expected: build succeeds, `dist/404.html` exists, and the script reports the verified base path.

- [ ] **Step 3: Add the official GitHub Pages workflow**

Create `.github/workflows/deploy-pages.yml` with:

- `push` on `main` plus `workflow_dispatch`.
- `contents: read`, `pages: write`, and `id-token: write` permissions.
- concurrency group `pages` with cancellation enabled.
- Node.js 20 and `npm ci` in `frontend`.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build:pages`.
- `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`.
- the deployment URL as the `github-pages` environment URL.

- [ ] **Step 4: Document the public preview**

Add the public URL, static-demo boundary, demo credentials, local reset behavior, and deployment trigger to `README.md`.

- [ ] **Step 5: Run full local verification**

Run: `cd frontend && npm run lint`

Run: `cd frontend && npm run typecheck`

Run: `cd frontend && npm test`

Run: `cd frontend && VITE_BASE_PATH=/deang-sour-tea-platform/ VITE_STATIC_DEMO=true npm run build:pages`

Expected: every command succeeds; 404 fallback and project-base assets are present.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy-pages.yml frontend/scripts/prepare-pages-build.mjs frontend/package.json README.md
git commit -m "ci: deploy frontend preview to GitHub Pages"
```

---

### Task 4: Publish and Verify the Public Site

**Files:**
- No source files unless deployment diagnostics reveal a verified defect.

**Interfaces:**
- Consumes: the verified commits from Tasks 1-3.
- Produces: a successful GitHub Pages deployment and public smoke-test evidence.

- [ ] **Step 1: Push the verified branch**

Run: `git push origin codex/vue-final-frontend`

Expected: remote branch advances to the final verified commit.

- [ ] **Step 2: Merge the existing pull request into `main`**

Use GitHub after confirming the PR is mergeable and checks are green. Do not bypass failed checks.

- [ ] **Step 3: Enable GitHub Actions as the Pages publishing source**

Confirm repository Pages settings use GitHub Actions. Re-authenticate GitHub CLI or use the authenticated browser session if required.

- [ ] **Step 4: Monitor deployment to success**

Confirm the `Deploy frontend to GitHub Pages` workflow completes both build and deploy jobs.

- [ ] **Step 5: Run real-network smoke tests**

Verify status and content for:

```text
https://15717082411.github.io/deang-sour-tea-platform/
https://15717082411.github.io/deang-sour-tea-platform/culture
https://15717082411.github.io/deang-sour-tea-platform/shop
https://15717082411.github.io/deang-sour-tea-platform/login
https://15717082411.github.io/deang-sour-tea-platform/images/hero-sour-tea.webp
```

Use a browser to confirm a direct route refresh, mobile layout, and each demo-role login.

- [ ] **Step 6: Record the final URL and deployment result**

Report the public URL, workflow result, tested routes, and the static-demo data boundary to the user.
