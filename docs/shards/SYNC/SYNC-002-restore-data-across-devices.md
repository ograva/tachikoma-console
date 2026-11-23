# SYNC-002 Restore Data Across Devices

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-002 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-002 |
| **Priority** | High |
| **Status** | In Progress |
| **GitHub Issue** | #58 |
| **Complexity** | M |
| **Depends On** | SYNC-001, AUTH-003 |

## Description

Implement deterministic cross-device restore for authenticated users using cloud-backed records. This shard must preserve timestamps, decrypt secure fields correctly, and honor selected sync strategy semantics. Restore behavior should maintain continuity without violating local-first guarantees.

## Acceptance Criteria

- [ ] Authenticated users can load cloud-backed chats, profiles, and settings on a new device.
- [ ] Restore logic preserves timestamps required for conflict resolution.
- [ ] Encrypted values are decrypted only after authorized retrieval and valid user context.

## Test Coverage

- [ ] Unit: Restore merge and decrypt flows with timestamp and strategy branch coverage.
- [ ] E2E: Login on second device and restore path with strategy-aware results (T405-T413) in `e2e/specs/sync/sync.spec.ts`.

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
