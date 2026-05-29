# AUTH-003 Choose First-Login Sync Strategy

| Field | Value |
| :--- | :--- |
| **Shard ID** | AUTH-003 |
| **Module** | AUTH - Identity, Access, and Secure Configuration |
| **Story Ref** | AUTH-003 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #41 |
| **Complexity** | M |
| **Depends On** | AUTH-001 |

## Description

Implement first-login sync strategy selection when both local and cloud state exist. The dialog must provide deterministic merge, cloud-to-local, and local-to-cloud choices and preserve local usability on cloud failure. This shard prevents accidental data loss at first authenticated entry.

## Acceptance Criteria

- [ ] First authenticated login with dual data sources prompts a sync strategy dialog.
- [ ] Selected strategy deterministically updates chats, profiles, and settings according to defined behavior.
- [ ] Failed cloud sync after local persistence does not block continued local usage.

## Test Coverage

- [ ] Unit: Sync strategy resolution logic and deterministic data merge direction behavior with Firestore access mocked.
- [ ] E2E: First-login strategy selection paths and post-selection state verification (T020-T026).

## Dev Notes

- Touch points: `src/app/components/sync-dialog/*`, `src/app/services/firestore.service.ts`, `src/app/services/auth.service.ts`.
- Keep dialog actions explicit and keyboard navigable.
- Preserve local-first constraints while applying strategy outcomes.


