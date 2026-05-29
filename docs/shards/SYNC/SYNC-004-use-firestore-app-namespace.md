# SYNC-004 Use Dedicated Firestore Database Isolation

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-004 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-004 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #56 |
| **Complexity** | M |
| **Depends On** | SYNC-001 |

## Description

Implement dedicated Firestore database isolation for all SAC cloud records. This shard prevents data collisions in shared Firebase projects by separating SAC data at the database level and keeping canonical user-scoped collection paths. Migration behavior must be controlled and explicit to avoid silent data divergence.

## Acceptance Criteria

- [ ] SAC Firestore reads/writes resolve to the SAC-dedicated Firestore database.
- [ ] Chat, profile, and user settings documents use canonical `/users/{userId}/...` path shapes within the SAC database.
- [ ] Existing sync and restore behavior remains functional after removing path prefixing.

## Test Coverage

- [ ] Unit: Firestore path builder and service write/read path assertions with dedicated-database fixtures.
- [ ] E2E: Authenticated sync and restore scenarios validating dedicated-database behavior (T421-T426).

## Dev Notes

- Touch points: `src/app/services/firestore.service.ts`, `src/app/services/chat-storage.service.ts`, `src/app/services/agent-profile.service.ts`, `src/app/services/user-profile.service.ts`.
- Constraint-critical: do not read/write SAC data outside the SAC-dedicated Firestore database.


