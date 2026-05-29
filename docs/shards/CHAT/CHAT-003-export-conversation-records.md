# CHAT-003 Export Conversation Records

| Field | Value |
| :--- | :--- |
| **Shard ID** | CHAT-003 |
| **Module** | CHAT - Chat Session Lifecycle and Workspace Organization |
| **Story Ref** | CHAT-003 |
| **Priority** | Medium |
| **Status** | Not Started |
| **GitHub Issue** | #49 |
| **Complexity** | S |
| **Depends On** | CHAT-002 |

## Description

Implement export flows that preserve transcript integrity for external reuse. This shard ensures order, attribution, and timestamp fidelity across text and PDF outputs. Export operations must remain read-only against active session state.

## Acceptance Criteria

- [ ] Users can export current chat to plain text and PDF.
- [ ] Export output preserves message order, speaker attribution, and timestamps.
- [ ] Filename sanitization and export errors are handled without mutating chat data.

## Test Coverage

- [ ] Unit: Export formatter and filename sanitization logic with edge-case file names.
- [ ] E2E: Export menu actions for text and PDF with output trigger validation (T213-T217).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`.
- Use existing export libraries; avoid introducing new UI frameworks.
- Keep export menu controls keyboard accessible.


