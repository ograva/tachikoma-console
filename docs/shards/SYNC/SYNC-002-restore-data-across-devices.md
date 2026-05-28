# SYNC-002 Restore Data Across Devices

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-002 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-002 |
| **Priority** | High |
| **Status** | Not Started |
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
- [ ] E2E: Login on second device and restore path with strategy-aware results (T407-T413).

## Dev Notes

- Touch points: `src/app/services/firestore.service.ts`, `src/app/services/user-profile.service.ts`, `src/app/services/chat-storage.service.ts`.
- Ensure restore logic resolves from namespaced paths once SYNC-004 is complete.
