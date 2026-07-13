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
