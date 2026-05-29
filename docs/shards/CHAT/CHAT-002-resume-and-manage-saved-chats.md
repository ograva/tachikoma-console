# CHAT-002 Resume and Manage Saved Chats

| Field | Value |
| :--- | :--- |
| **Shard ID** | CHAT-002 |
| **Module** | CHAT - Chat Session Lifecycle and Workspace Organization |
| **Story Ref** | CHAT-002 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #48 |
| **Complexity** | M |
| **Depends On** | CHAT-001 |

## Description

Implement reliable chat resume and management controls so long-running work remains recoverable and editable. This shard covers history drawer behavior, metadata edits, and deterministic restore of session state. It must preserve participant snapshots and transcript continuity.

## Acceptance Criteria

- [ ] Saved chats list with identifying metadata is available in chat history UI.
- [ ] Switching chats restores messages, participants, and summary state correctly.
- [ ] Delete and metadata edit flows persist correctly with explicit user confirmation.

## Test Coverage

- [ ] Unit: Chat restore, delete, and metadata update logic with local-first persistence checks.
- [ ] E2E: Chat history switch/edit/delete scenarios with restore verification (T206-T212).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/*`, `src/app/services/chat-storage.service.ts`.
- UI Task Ref: UI-TB-002.
- Preserve stable ordering and avoid destructive side effects when switching sessions.


