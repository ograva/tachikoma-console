# ORCH-004 Handle Failed Persona Steps Explicitly

| Field | Value |
| :--- | :--- |
| **Shard ID** | ORCH-004 |
| **Module** | ORCH - Multi-Agent Conversation Protocol |
| **Story Ref** | ORCH-004 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | ORCH-001 |

## Description

Implement explicit failed-step handling so persona failures are visible and policy-driven instead of silently skipped. This shard enforces bounded retry and transcript-level failure state rendering required by v1.3 baseline. It must preserve deterministic continuation behavior for remaining personas when hard-stop is not triggered.

## Acceptance Criteria

- [ ] Persona failures trigger one reduced-context retry attempt per policy.
- [ ] Retry exhaustion renders explicit failed-step transcript cards with actionable messaging.
- [ ] Protocol continues deterministically for remaining personas unless explicit hard-stop policy applies.

## Test Coverage

- [ ] Unit: Retry policy and failure-state message construction logic with hard-stop branch coverage.
- [ ] E2E: Persona failure simulation showing retry then explicit failed-step transcript rendering (T321-T327).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`, `src/app/models/chat-message.model.ts`.
- Constraint-critical: silent skipping is prohibited.
- UI Task Ref: UI-TB-001.
