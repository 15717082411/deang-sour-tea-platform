# Task 3 Report: Versioned Demo Repository

## Delivered

- Added the `PlatformRepository` contract and `createDemoRepository(storage)` implementation.
- Added deterministic v2 seed data under `deang-sour-tea:v2` with the three demo accounts, approved and pending products, culture articles, pending merchant application and booking, shipped receipt scenario, and requested after-sale scenario.
- Reused the Task 2 state machines for every order, product, booking, and after-sale transition.
- Persisted every mutation, returned cloned resources at repository boundaries, checked persisted user roles and merchant ownership, and made successful repeated payment idempotent.

## Tests

- The focused lifecycle test was run red before implementation because `createDemoRepository` was absent.
- The focused suite covers registration/payment, duplicate user rejection, invalid phone, stock shortage, payment idempotency, role and ownership restrictions, persistence/reset, cloning, and every required seed scenario.
- Final verification: `npm test -- src/tests/data/demoRepository.spec.ts`, `npm run typecheck`, `npm test`, and `git diff --check`.

## Review

- No blocking issues found during self-review.
- The brief's illustrative `createOrder` call omits both `AuthSession.user` and `OrderContact`, despite their declared contracts. The implementation follows the declared `AuthSession` and requires contact data, while accepting price-free order lines so server-side product pricing remains authoritative.

## Review Findings Remediation (2026-07-13)

### RED

- Command: `npm test -- src/tests/data/demoRepository.spec.ts`
- Old-code result: `1` test file failed; `3` tests failed and `7` passed out of `10`.
- Relevant failures:
  - A merchant actor with `merchant_demo`'s user ID and a forged second merchant ID could read a paid order owned by that second merchant: the promise resolved instead of rejecting.
  - A `merchant_demo` user ID forged with role `USER` could receive its own valid `SHIPPED` order: the promise resolved with status `RECEIVED` instead of rejecting.
  - The same forged role could request after-sale for its own valid `PAID` order: the promise resolved with an `REQUESTED` after-sale instead of rejecting.

### GREEN

- Command: `npm test -- src/tests/data/demoRepository.spec.ts`
- Result: `1` test file passed; `10` tests passed out of `10`.
- Command: `npm run typecheck`
- Result: passed with exit code `0` (`vue-tsc -b --force`).

### Files Changed

- `frontend/src/data/demoRepository.ts`
- `frontend/src/tests/data/demoRepository.spec.ts`
- `.superpowers/sdd/task-3-report.md`

### Self-Review

- `getOrder` now derives merchant ownership through the existing persisted `merchantId(actor)` helper; caller-controlled `actor.merchantId` cannot grant cross-merchant access.
- `receiveOrder` and `requestAfterSale` now route through `actorRole(actor, 'USER')`, which validates the persisted user and role before any order mutation.
- The cross-merchant case creates and pays an order for a separately approved merchant, so rejection is independent of an invalid order status.
- The accepted price-free `OrderRequestLine` and repository-side catalog pricing behavior were not changed.

## Contract Correction: Merchant Application Option A (2026-07-13)

### RED

- Command: `npm test -- src/tests/data/demoRepository.spec.ts`
- Old-code result: `1` test file failed; `5` tests failed and `11` passed out of `16`.
- Relevant failure: every actor-based merchant application test failed with `用户不存在`, because the old implementation treated the persisted `Actor` object as the former caller-supplied `userId` string.

### GREEN

- Command: `npm test -- src/tests/data/demoRepository.spec.ts`
- Result: `1` test file passed; `16` tests passed out of `16`.
- Command: `npm run typecheck`
- Result: passed with exit code `0` (`vue-tsc -b --force`).

### Files Changed

- `frontend/src/data/repository.ts`
- `frontend/src/data/demoRepository.ts`
- `frontend/src/tests/data/demoRepository.spec.ts`
- `docs/superpowers/plans/2026-07-13-final-interactive-frontend.md`
- `.superpowers/sdd/task-3-report.md`

### Self-Review

- `PlatformRepository.applyMerchant` now accepts exactly `actor: Actor` and `input`; its type assertion prevents a later caller from reintroducing a target-user parameter.
- The implementation validates the persisted actor with `actorRole(actor, 'USER')` and writes `application.userId` from that persisted user only. A pending user and a merchant cannot create another application; a rejected `USER` can submit corrected details as a new pending application.
- `getMerchantApplication` returns the latest application so a corrected resubmission is observable after a rejection.
- The suite retains the existing negative authorization cases and adds positive persisted-merchant own-order and legitimate-user own-after-sale cases.
- `OrderRequestLine` remains price-free and `createOrder` continues to obtain unit prices from the approved catalog.

## Task 3: Reproducible Pages Artifact and Workflow (2026-07-14)

### Status

Implementation, Pages artifact construction, type checking, and unit tests completed. Full lint did not pass because of the pre-existing `no-unexpected-multiline` violation in `frontend/src/tests/utils/assetUrl.spec.ts:20`; this task neither modified that file nor permits changing it.

### Modified Files

- `.github/workflows/deploy-pages.yml`
- `frontend/scripts/prepare-pages-build.mjs`
- `frontend/package.json`
- `README.md`

### Verification Commands And Results

| Command | Result |
| --- | --- |
| `cd frontend && npm run lint` | Failed: one existing ESLint error at `src/tests/utils/assetUrl.spec.ts:20:5`; the new script passed `npx eslint scripts/prepare-pages-build.mjs`. |
| `cd frontend && npm run typecheck` | Passed. |
| `cd frontend && npm test` | Passed: 33 test files and 252 tests. |
| `cd frontend && VITE_BASE_PATH=/deang-sour-tea-platform/ VITE_STATIC_DEMO=true npm run build:pages` | Passed and reported the verified base path. |

### Build Artifact Assertions

- `dist/index.html` and `dist/404.html` are identical.
- `dist/images/hero-sour-tea.webp` exists.
- `dist/index.html` includes `/deang-sour-tea-platform/assets/`.

### Commit And Push

- Commit: `d00ac59 ci: deploy frontend preview to GitHub Pages`
- Push: succeeded, `codex/vue-final-frontend -> origin/codex/vue-final-frontend`; the upstream branch was configured.

### Concern

The workflow runs the full `npm run lint`. Until the baseline ESLint violation in `frontend/src/tests/utils/assetUrl.spec.ts:20` is fixed by its owner, GitHub Pages deployment will stop before artifact upload and deployment.
