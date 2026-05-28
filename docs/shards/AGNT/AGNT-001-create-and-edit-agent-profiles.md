# AGNT-001 Create and Edit Agent Profiles

| Field | Value |
| :--- | :--- |
| **Shard ID** | AGNT-001 |
| **Module** | AGNT - Agent Profiles and Instruction Design |
| **Story Ref** | AGNT-001 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | AUTH-001 |

## Description

Implement robust create/edit profile workflows so users can build custom persona sets with stable persistence. This shard establishes the agent profile lifecycle needed by orchestration and chat setup. It must preserve model normalization and historical snapshot expectations.

## Acceptance Criteria

- [ ] Users can create profiles with name, role, color, model, and system instruction fields.
- [ ] Users can edit existing profiles and save deterministic updates.
- [ ] Local persistence occurs immediately and cloud sync forwards asynchronously when authenticated.

## Test Coverage

- [ ] Unit: Agent profile model normalization and CRUD service methods with Firestore interactions mocked.
- [ ] E2E: Create/edit/save profile flow with persistence verification (T100-T106).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-profiles/*`, `src/app/services/agent-profile.service.ts`, `src/app/models/agent-profile.model.ts`.
- Preserve default agent protection rules and snapshot semantics.
- UI Task Ref: UI-TB-011.
