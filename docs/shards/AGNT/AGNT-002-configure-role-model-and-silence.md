# AGNT-002 Configure Role, Model, and Silence

| Field | Value |
| :--- | :--- |
| **Shard ID** | AGNT-002 |
| **Module** | AGNT - Agent Profiles and Instruction Design |
| **Story Ref** | AGNT-002 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #43 |
| **Complexity** | M |
| **Depends On** | AGNT-001 |

## Description

Implement role, model, and silence configuration guardrails for each persona profile. This shard ensures behavior controls are explicit and constrained to allowed model policy. It defines profile-level behavior primitives consumed by round-robin execution.

## Acceptance Criteria

- [ ] Agents support chatter or moderator role assignment with clear validation.
- [ ] Model selection enforces constraint-approved Gemini policy and fallback behavior.
- [ ] Silence protocol modes are configurable and validated before save.

## Test Coverage

- [ ] Unit: Role/model/silence validation logic in profile model/service with invalid combinations covered.
- [ ] E2E: Profile behavior configuration and validation messaging (T107-T112).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-profiles/*`, `src/app/models/agent-profile.model.ts`.
- Keep model policy aligned to constraints and canonical data model spec.
- Coordinate with ORCH shards that consume silence/role configuration.


