# OPER-003 Prevent Context Overflow

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-003 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | OPER-003 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | L |
| **Depends On** | ORCH-003, OPER-001 |

## Description

Implement layered context budgeting to prevent overflow while preserving coherence for active rounds. This shard applies pinned facts, rolling recent rounds, compact summary, and current turn in strict order. Trimming and compaction must be deterministic and explainable for debugging.

## Acceptance Criteria

- [ ] Context assembly follows layered policy: pinned facts, recent rounds, compact summary, current turn.
- [ ] Overflow prevention trims lower-priority layers before high-priority layers.
- [ ] Context compaction outcomes are visible in diagnostics for operator troubleshooting.

## Test Coverage

- [ ] Unit: Layered budget allocator and truncation policy logic with deterministic ordering checks.
- [ ] E2E: Long-running conversation exercising compaction while preserving reply coherence (T514-T520).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- Constraint-critical: layered context budgeting is mandatory v1.3 behavior.
- UI Task Ref: UI-TB-003.
