# SYNC-001 Save Locally Before Cloud Sync

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-001 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-001 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #55 |
| **Complexity** | M |
| **Depends On** | AUTH-001 |

## Description

Implement local-first persistence as the mandatory first write path before any cloud forwarding. This shard protects perceived reliability during unstable network conditions and forms the baseline for all sync behavior. Cloud forwarding must remain asynchronous and non-blocking.

## Acceptance Criteria

- [ ] Chats, profiles, and settings save locally before cloud sync attempts.
- [ ] UI state reflects successful local saves immediately.
- [ ] Cloud failures do not block continued local usage.

## Test Coverage

- [ ] Unit: Local-first write path and async cloud forward behavior with simulated cloud failure cases.
- [ ] E2E: Save while online and save while cloud unavailable with continued local usability (T400-T406).

## Dev Notes

- Touch points: `src/app/services/chat-storage.service.ts`, `src/app/services/agent-profile.service.ts`, `src/app/services/user-profile.service.ts`.
- Constraint-critical: Firestore cannot be treated as primary runtime state store.


