# E2E Runtime Strategy Draft

| Version | Status | Date | Owner |
| :---- | :---- | :---- | :---- |
| 0.1 | Draft | 2026-05-29 | Quinn (QA Engineer) |

## 1. Purpose

Define a pragmatic test execution strategy:
- Use ng-serve for fast fix/debug loops.
- Use Firebase Hosting emulator for smoke and regression runs.

This draft captures the intended workflow for later formalization into scripts/CI.

## 2. Guiding Principle

Use the fastest environment that still proves the target behavior:
- Fast local iteration: ng-serve + emulators.
- Release confidence: built artifacts served by Hosting emulator + emulators.

## 3. Execution Matrix

### A. Fix/Debug Loop (Developer Inner Loop)

Runtime:
- ng serve (local Angular config)
- Firebase emulators (Auth/Firestore/Storage)

Use for:
- UI bug fixes.
- Selector stabilization.
- Flow debugging and rapid reruns.

Recommended commands:
- npm run dev:local
- (or split) npm run start:local and npm run firebase:emulators

### B. Smoke/Regression (Pre-merge or CI-like)

Runtime:
- ng build --configuration local
- Firebase Hosting emulator serving dist output
- Firebase emulators (Auth/Firestore/Storage)

Use for:
- Route rewrite behavior checks.
- Static build parity checks.
- Broader smoke/regression confidence pass.

Recommended command shape:
1. Build local artifacts.
2. Start emulators including hosting.
3. Wait for hosting URL.
4. Run E2E suite against hosting URL.

## 4. Why Hosting Emulator for Smoke/Regression

Benefits:
1. Closer to production deployment topology than ng-serve.
2. Validates SPA rewrites and static asset behavior.
3. Helps catch build-only breakage earlier.

Tradeoffs:
1. Slower than ng-serve loop.
2. Requires explicit build and startup orchestration.

## 5. Base URL Policy (Draft)

For E2E configuration:
- Fix/debug profile baseURL: http://127.0.0.1:4200
- Smoke/regression profile baseURL: http://127.0.0.1:5000

Rule:
- Never point local E2E to production URLs.

## 6. Test Data Policy

Use deterministic local data:
1. Reset emulator data when suite requires clean state.
2. Seed baseline user/profile/chat fixtures before runs.
3. Keep smoke tests independent and idempotent.

Current helper commands in workspace:
- npm run firebase:emulators:reset
- npm run firebase:emulators:seed
- npm run firebase:emulators:smoke

## 7. Proposed Script Additions (Future)

Draft command targets to add later:
- test:e2e:local-fast (ng-serve target)
- test:e2e:local-hosting-smoke (hosting target)
- test:e2e:local-hosting-regression (hosting target, wider suite)

Expected flow for hosting smoke command:
1. Build local
2. Start emulators with hosting
3. Wait for http://127.0.0.1:5000
4. Run E2E smoke tests
5. Export emulator data and stop

## 8. CI Strategy (Future)

Recommended split:
1. PR quick check: targeted smoke against hosting emulator.
2. Nightly or gated full regression: full suite against hosting emulator.

Keep both on emulators to avoid external flakiness and production coupling.

## 9. Acceptance Criteria (Draft)

1. Developers can run fast fix loop in one command.
2. Smoke/regression runs execute against hosting emulator URL.
3. No local/CI test points at production resources.
4. Seed/reset flow is deterministic and documented.

## 10. Open Questions

1. Which Playwright project layout should be canonical in this repo long-term?
2. What subset qualifies as smoke vs full regression by story IDs?
3. Should hosting-smoke become mandatory in pre-push hooks, or CI-only?
