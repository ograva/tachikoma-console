# CHAT-001 Start a New Chat with Context

| Field | Value |
| :--- | :--- |
| **Shard ID** | CHAT-001 |
| **Module** | CHAT - Chat Session Lifecycle and Workspace Organization |
| **Story Ref** | CHAT-001 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #47 |
| **Complexity** | M |
| **Depends On** | AGNT-001 |

## Description

Implement new chat creation with metadata and selected roster so each session begins with clear scope. This shard establishes the durable chat artifact boundary used by protocol and sync modules. Shared chat description context must be retained for downstream orchestration.

## Acceptance Criteria

- [ ] New chat flow supports optional title and description fields.
- [ ] Participating roster selection is required and validated before chat creation.
- [ ] Chat description persists and is available as shared context for later protocol calls.

## Test Coverage

- [ ] Unit: Chat session creation and metadata persistence logic with model normalization checks.
- [ ] E2E: New chat creation with roster selection and metadata restore checks (T200-T205).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`, `src/app/models/chat-session.model.ts`.
- Keep one source of truth for current chat identity and selected agents.
- Ensure required `data-test-id` attributes remain present in dialog controls.


