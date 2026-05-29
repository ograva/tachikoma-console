# ORCH-001 Run Round-Robin Agent Cycles

| Field | Value |
| :--- | :--- |
| **Shard ID** | ORCH-001 |
| **Module** | ORCH - Multi-Agent Conversation Protocol |
| **Story Ref** | ORCH-001 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #51 |
| **Complexity** | L |
| **Depends On** | CHAT-001, AGNT-002 |

## Description

Implement deterministic round-robin protocol execution across selected personas with moderator-last behavior. This shard is the orchestration core that coordinates input submission, processing status, and ordered output handling. It must preserve sequential determinism and avoid silent failures.

## Acceptance Criteria

- [ ] Submitting user input triggers sequential persona execution across the selected roster.
- [ ] Chatter order can be randomized while moderator execution remains last.
- [ ] Processing states are visible and transition correctly during execution lifecycle.

## Test Coverage

- [ ] Unit: Round planner and processing-state transition logic with mocked model calls and deterministic ordering checks.
- [ ] E2E: End-to-end round execution with roster ordering and visible processing indicators (T300-T307).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- Keep client-side orchestration boundary per constraints.
- UI Task Ref: UI-TB-001.


