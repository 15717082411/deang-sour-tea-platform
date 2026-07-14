# Task 9 Implementation Report

## Scope

Implemented the merchant application and approved-merchant workspace for the Deang sour tea platform:

- Agreement-gated merchant application with pending, approved, and rejected states.
- Ownership-aware private product listing, draft editing, and one-time submission.
- Live dashboard metrics from the current merchant's products, orders, and after-sales.
- Order filtering and PAID-only one-time shipping.
- After-sale approval, rejection, and simulated refund actions.
- Responsive table/list layouts, filters, pagination, loading, empty, error, and success states.
- Actor-aware Pinia state reset on account changes.

## TDD Evidence

RED:

```text
FAIL src/tests/merchant/merchantWorkspace.spec.ts
Failed to resolve import "../../stores/merchant"
```

GREEN:

```text
src/tests/merchant/merchantWorkspace.spec.ts: 7/7 passed
```

The tests cover agreement confirmation, duplicate application prevention, private product ownership, positive price validation, draft submission, PAID-only shipping, repeated shipping rejection, live metrics, real route wiring, and the application form workflow.

## Verification

```text
npm test: 25 files, 211 tests passed
npm run typecheck: passed
npm run lint: passed
npm run build: passed
git diff --check: passed
```

One parallel targeted run hit a Vitest worker RPC timeout before collecting tests. The same merchant suite passed immediately when rerun alone; the full suite also passed. Vite still reports the existing main-chunk size warning and third-party PURE-comment warnings.

## Review Notes

- Public product listing remains APPROVED-only; `listMerchantProducts(actor)` returns all statuses for the persisted merchant only.
- New applications record `agreementAcceptedAt` while older persisted applications remain compatible.
- Product editing is restricted to DRAFT and REJECTED; submission uses the existing product state machine.
- Merchant metrics are derived from owned records and are not hard-coded.
