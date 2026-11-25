# SYNC-002 Restore Data Across Devices

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-002 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-002 |
| **Priority** | High |
| **Status** | Completed |
| **GitHub Issue** | #58 |
| **Complexity** | M |
| **Depends On** | SYNC-001, AUTH-003 |

## Description

Implement deterministic cross-device restore for authenticated users using cloud-backed records. This shard must preserve timestamps, decrypt secure fields correctly, and honor selected sync strategy semantics. Restore behavior should maintain continuity without violating local-first guarantees.

## Acceptance Criteria

- [x] Authenticated users can load cloud-backed chats, profiles, and settings on a new device.
- [x] Restore logic preserves timestamps required for conflict resolution.
- [x] Encrypted values are decrypted only after authorized retrieval and valid user context.

## Test Coverage

- [x] Unit: Restore merge and decrypt flows with timestamp and strategy branch coverage.
- [x] E2E: Login on second device and restore path with strategy-aware results (T405-T413) in `e2e/specs/sync/sync.spec.ts`.

## Dev Notes

- Touch points: `src/app/services/firestore.service.ts`, `src/app/services/user-profile.service.ts`, `src/app/services/chat-storage.service.ts`.
- Ensure restore logic resolves against the SAC-dedicated Firestore database once SYNC-004 is complete.

## Reopen Note (2026-11-23)

Reopened from `Done` by owner decision after Quinn's `/gate` FAIL (commit 901973d). The E2E suite T405–T413 in `e2e/specs/sync/sync.spec.ts` exposes these defects; T406, T407 and T410 are marked `test.fail()` until they're fixed:
- **Critical:** the local-to-cloud ("Use Local Data") strategy deletes the cloud `user_profile` (`FirestoreService.syncCollection` reads an object as an array).
- **High:** sync strategies write `firestore_{uid}_*` keys that the UI never reads (T410).
- **High:** `ChatMessageModel.normalize()` strips `roundId`, `messageType` and `retryCount` on restore (T406).
- **High:** cloud restore merges by id only, so newer cloud versions of existing records are never restored.
- **Medium:** restored chats come back oldest-first (T407).

Exit: Athena fixes the defects and removes the `test.fail()` markers, then Quinn re-runs `/gate`.

## Gate (2026-11-25)

**Verdict: PASS** (Quinn, Phase 10, re-gate on HEAD 2ec21d1 after A4/A5/A7 in 66c609a). Status set to `Completed`.

- ACs: restore of chats, agents and settings on a new device (T405, T408), timestamps kept (T406, unit), decryption only for the signed-in user (T427, `UserProfileService.fromCloud` unit cases).
- Runs: `npx playwright test e2e/specs/sync` 25 passed / 0 failed (no `test.fail` left; T428 passes for real); SYNC unit specs 203/203; full unit suite 271/271; `npm run test:registry:check` up to date; emulator Firestore scan 37 docs, 0 `nullValue` (DAT-302).
- Previous High (A4: merge overwrote cloud-edited default agents) fixed by the shared rule `cloudCopyWins` / `mergeSyncRecords` / `yieldsToCloud`. Tie-rule inconsistency and `photoURL: null` fixed.
- Residual, non-blocking:
  - **Medium:** a default agent or chat deleted on one device comes back from another device's merge or whole-set upload (no tombstones). Product decision for Jason.
  - **Medium:** if "Use Local Data" is clicked before the cloud profile load (B) finishes, the pre-sign-in local profile is laid over the cloud settings (Flow E11).
  - **Medium (SYNC-001 write path):** `AgentProfileService.syncToCloud` uploads every profile on any create or update, bypassing the merge rule, so a stale copy of another agent can overwrite a newer edit made on another device.
  - **Low:** `firstLogin` is set after the auth listener fires; the deferral relies on microtask ordering (no failing test).
  - **Low:** `FirestoreService.saveBatch` writes without `sanitizeForFirestore` (no callers).
  - **Low / accepted:** cloud wins equal-`updatedAt` ties even when content differs; a default deleted locally before first sign-in is restored from the cloud; "Use Local Data" cannot clear a cloud API key (deferred to the Firebase AI Logic migration).
