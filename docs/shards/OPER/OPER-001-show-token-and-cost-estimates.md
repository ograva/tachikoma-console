# OPER-001 Show Token and Cost Estimates

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-001 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | OPER-001 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | ORCH-001 |

## Description

Implement runtime token and cost estimate visibility to improve user trust and control. This shard adds transparent usage indicators tied to round execution and response generation. Estimate logic should be conservative and clearly identified as approximate where required.

## Acceptance Criteria

- [ ] Token estimate indicators appear for active chat rounds and/or final outputs.
- [ ] Cost estimate indicators are shown with clear units and labels.
- [ ] Estimate rendering does not block or delay orchestration execution.

## Test Coverage

- [ ] Unit: Token/cost estimate calculator and formatting behavior with boundary-size payload cases.
- [ ] E2E: Multi-round conversation showing estimate updates and stable rendering (T500-T506).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- UI Task Ref: UI-TB-004.
- Keep estimate confidence messaging explicit where exact counts are unavailable.
