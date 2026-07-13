# Task 4 Report: Authentication, Routing, and Layouts

## Scope

- Added the Pinia application and authentication stores, including demo-mode repository injection, a persisted session reference, rehydration through `PlatformRepository.getUser`, and logout.
- Added role-aware Vue Router records and guards for public, account, merchant, admin, forbidden, and not-found routes. Future feature routes deliberately use a neutral temporary placeholder rather than claiming unfinished capabilities.
- Added public, account, and merchant/admin workspace layouts; public header navigation; demo-mode banner; login/register pages; and system pages.
- Wired the application bootstrap to one shared Pinia instance and the route factory.

## TDD Evidence

### RED

Command:

```text
npm test -- src/tests/router src/tests/auth
```

Initial result: two failed suites before implementation. `guards.spec.ts` could not resolve `../../router`; `LoginPage.spec.ts` could not resolve `../../components/common/AppHeader.vue`.

### GREEN

After the initial implementation, form tests exposed an asynchronous assertion timing issue and a real circular module dependency (`LoginPage -> router -> LoginPage`), which produced the Vue Router warning that `/login` was missing its component. The redirect sanitizer was extracted into `src/router/redirect.ts`, and form assertions wait for submitted promises.

Focused command:

```text
npm test -- src/tests/router src/tests/auth
```

Result: 2 files passed, 16 tests passed.

Final full command:

```text
npm test
```

Result: 6 files passed, 56 tests passed.

## Files

- Created `frontend/src/router/index.ts` and `frontend/src/router/redirect.ts`.
- Created `frontend/src/stores/app.ts` and `frontend/src/stores/auth.ts`.
- Created the requested common components, layouts, auth pages, system pages, and router/auth test suites.
- Updated `frontend/src/main.ts` and `frontend/src/App.vue` for the shared Pinia/router bootstrap and the existing root-identity test contract.

## Checks

```text
npm test -- src/tests/router src/tests/auth  # 16 passed
npm test                                    # 56 passed
npm run typecheck                           # exit 0
npm run build                               # exit 0
git diff --check                            # clean
```

## Self-review

- Session persistence stores exactly `{ userId, sessionId }`; the user record is reloaded from the repository, not from browser storage.
- Guards handle guest checkout, USER admin denial, pending merchant routing, and ADMIN access. `canAccess(route)` remains available on the auth store for consumers outside the global guard.
- Redirect targets accept only internal paths beginning with `/` and reject absolute, protocol-relative, and backslash-prefixed values.
- Merchant application calls remain outside the routing/auth layer, preserving the Task 3 repository actor boundary.
- Mobile navigation has labelled, tooltip-backed icon controls and a tested open/close drawer state.

## Concerns

- Resolved in the 2026-07-13 remediation below: Task 3's two confirmed unused type imports were removed, and the Task 4 formatting warnings were fixed with a scoped ESLint command.
- Vite reports existing bundle-size and third-party pure-comment warnings during a successful production build. Route components are intentionally direct imports for this small task; later page work can introduce route-level lazy loading when the actual page bundles exist.

## Review Findings Remediation (2026-07-13)

### RED

Added `/account\\evil` and `/checkout\\foo` to the unsafe redirect regression table in `frontend/src/tests/router/guards.spec.ts` before changing production code.

```text
npm test -- src/tests/router/guards.spec.ts
Test Files  1 failed (1)
Tests  2 failed | 12 passed (14)
```

Both failures received the original value from `sanitizeRedirect` instead of `null`:

```text
expected '/account\evil' to be null
expected '/checkout\foo' to be null
```

### GREEN And Focused Test

Changed `sanitizeRedirect` to reject any string containing `\\`, while retaining the existing leading `/` and protocol-relative-path checks. The existing valid internal path assertion remains covered.

```text
npm test -- src/tests/router/guards.spec.ts
Test Files  1 passed (1)
Tests  14 passed (14)
```

### Full Lint

Scoped ESLint `--fix` to the eight Task 4 Vue files reported by the reviewer, then removed the confirmed unused `OrderContact` and `ReviewDecision` type imports from Task 3's `frontend/src/data/demoRepository.ts`.

```text
npm run lint
> eslint .
exit 0
```

### Typecheck

```text
npm run typecheck
> vue-tsc -b --force
exit 0
```

### Changed Files

- `.superpowers/sdd/task-4-report.md`
- `frontend/src/router/redirect.ts`
- `frontend/src/tests/router/guards.spec.ts`
- `frontend/src/data/demoRepository.ts`
- `frontend/src/components/common/AppHeader.vue`
- `frontend/src/components/common/ModeBanner.vue`
- `frontend/src/layouts/AccountLayout.vue`
- `frontend/src/layouts/WorkspaceLayout.vue`
- `frontend/src/pages/auth/LoginPage.vue`
- `frontend/src/pages/auth/RegisterPage.vue`
- `frontend/src/pages/system/ForbiddenPage.vue`
- `frontend/src/pages/system/NotFoundPage.vue`

### Self-Review

- The regression test failed before the production change and passes after it; both representative internal-looking paths containing a backslash are rejected.
- Valid internal redirects remain accepted when they begin with one `/`, are not protocol-relative, and contain no backslash.
- Formatting changes are restricted to the Task 4 Vue files named in the lint output; the Task 3 source edit removes only the two confirmed unused type imports.
- `git diff --check` completed with no output.

## Re-review Blocker Remediation (2026-07-13)

### RED

Added merchant-workspace authorization coverage for an ADMIN, a registered `USER/NONE`, and an approved `MERCHANT`; the existing `USER/PENDING` case remains covered.

```text
npm test -- src/tests/router/guards.spec.ts
Test Files  1 failed (1)
Tests  1 failed | 16 passed (17)
```

The ADMIN regression reproduced the blocker:

```text
expected '/merchant/apply' to be '/403'
Expected: "/403"
Received: "/merchant/apply"
```

### GREEN And Focused Test

Restricted the merchant application/status redirect to `USER` and `MERCHANT` actors. Other roles continue to flow through `auth.canAccess(to)`, which applies the route role metadata and returns the forbidden route.

```text
npm test -- src/tests/router/guards.spec.ts
Test Files  1 passed (1)
Tests  17 passed (17)
```

### Full Lint And Typecheck

```text
npm run lint
> eslint .
exit 0

npm run typecheck
> vue-tsc -b --force
exit 0
```

### Changed Files

- `.superpowers/sdd/task-4-report.md`
- `frontend/src/router/index.ts`
- `frontend/src/tests/router/guards.spec.ts`

### Self-Review

- `ADMIN/NONE` receives `/403` for `/merchant`; it cannot enter the merchant application/status flow.
- `USER/PENDING` and `USER/NONE` receive `/merchant/apply`; `MERCHANT/APPROVED` reaches `/merchant`.
- The existing guest checkout redirect, USER admin denial, redirect-sanitization tests, pending merchant behavior, lint, and typecheck remain covered by the focused suite and final checks.
