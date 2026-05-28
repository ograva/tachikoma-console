# SYNC-004 Use Firestore App Namespace

| Field | Value |
| :--- | :--- |
| **Shard ID** | SYNC-004 |
| **Module** | SYNC - Persistence, Offline Continuity, and Cross-Device Recovery |
| **Story Ref** | SYNC-004 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | SYNC-001 |

## Description

Implement namespaced Firestore paths under `apps/sac` for all SAC cloud records. This shard prevents data collisions in shared Firebase projects and enforces v1.3 namespace policy. Migration behavior must be controlled and explicit to avoid silent data divergence.

## Acceptance Criteria

- [ ] All SAC read/write paths resolve under `apps/sac` namespace.
- [ ] Chat, profile, and user settings documents use canonical namespaced path shapes.
- [ ] Existing sync and restore behavior remains functional under namespaced paths.

## Test Coverage

- [ ] Unit: Firestore path builder and service write/read path assertions with namespaced fixtures.
- [ ] E2E: Authenticated sync and restore scenarios validating namespaced path behavior (T421-T426).

## Dev Notes

- Touch points: `src/app/services/firestore.service.ts`, `src/app/services/chat-storage.service.ts`, `src/app/services/agent-profile.service.ts`, `src/app/services/user-profile.service.ts`.
- Constraint-critical: do not read/write SAC collections outside `apps/sac`.
