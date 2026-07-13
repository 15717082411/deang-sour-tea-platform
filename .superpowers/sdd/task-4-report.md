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

- `npm run lint` remains non-zero because Task 3's `frontend/src/data/demoRepository.ts` contains two pre-existing unused type imports (`OrderContact`, `ReviewDecision`). This task adds formatting warnings but no lint errors. It is intentionally excluded from this Task 4-only change.
- Vite reports existing bundle-size and third-party pure-comment warnings during a successful production build. Route components are intentionally direct imports for this small task; later page work can introduce route-level lazy loading when the actual page bundles exist.
