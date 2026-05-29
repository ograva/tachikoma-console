# ORCH-002 Apply Silence and Synthesis Rules

| Field | Value |
| :--- | :--- |
| **Shard ID** | ORCH-002 |
| **Module** | ORCH - Multi-Agent Conversation Protocol |
| **Story Ref** | ORCH-002 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #52 |
| **Complexity** | M |
| **Depends On** | ORCH-001 |

## Description

Implement silence filtering and synthesis behavior so protocol output remains concise and useful. This shard ensures redundant responses are suppressed while moderator synthesis remains coherent and traceable. Silence behavior must be diagnosable for operational confidence.

## Acceptance Criteria

- [ ] Valid silence outputs are excluded from visible transcript rendering.
- [ ] Moderator synthesis incorporates same-round prior persona context.
- [ ] Silence and synthesis behavior is traceable through diagnostics or logs.

## Test Coverage

- [ ] Unit: Silence signal classification and transcript filtering logic with moderator synthesis context assembly tests.
- [ ] E2E: Multi-agent run demonstrating silence suppression and synthesis rendering (T308-T314).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`, `src/app/models/agent-profile.model.ts`.
- Keep behavior deterministic and avoid brittle string-matching where possible.


