# OPER-002 Stop at Soft and Hard Token Limits

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-002 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | OPER-002 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #60 |
| **Complexity** | M |
| **Depends On** | OPER-001, ORCH-001 |

## Description

Implement soft and hard token guardrails so rounds terminate safely before budget overrun. This shard provides preflight checks, in-round safeguards, and clear user-facing notifications. Behavior must align with configured limit policy and avoid partial silent truncation.

## Acceptance Criteria

- [ ] Soft limit warnings appear before hard-stop thresholds.
- [ ] Hard limit enforcement halts continuation and surfaces explicit reason in transcript/UI.
- [ ] Limit policy behavior is consistent across normal and retry paths.

## Test Coverage

- [ ] Unit: Limit policy evaluator with soft-warning and hard-stop branch coverage.
- [ ] E2E: Conversation path crossing soft and hard thresholds with expected UX states (T507-T513).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- Coordinate with ORCH-004 failure-step rendering for limit-exhausted transcript states.


