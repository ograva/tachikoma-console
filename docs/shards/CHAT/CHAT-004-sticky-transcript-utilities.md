# CHAT-004 Sticky Transcript Utilities

| Field | Value |
| :--- | :--- |
| **Shard ID** | CHAT-004 |
| **Module** | CHAT - Chat Session Lifecycle and Workspace Organization |
| **Story Ref** | None |
| **Priority** | Low |
| **Status** | Not Started |
| **Complexity** | S |
| **Depends On** | CHAT-001 |

## Description

Add sticky transcript utilities for fast vertical navigation in long chat sessions. This shard introduces jump-to-top, jump-to-latest, and jump-to-previous-unread actions with idle-aware visibility. The goal is to reduce repetitive scrolling while preserving transcript readability.

## Acceptance Criteria

- [ ] Floating utility controls for top, latest, and previous unread navigation are available in chat.
- [ ] Utility controls auto-hide when idle and reappear on user scroll interaction.
- [ ] Controls do not obstruct core message content across mobile and desktop breakpoints.

## Test Coverage

- [ ] Unit: Transcript utility visibility state and jump target calculation logic with chat state services mocked.
- [ ] E2E: Long transcript navigation flow validating top/latest/unread jumps and control visibility (T218-T223).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`, `src/app/pages/tachikoma-chat/tachikoma-chat.component.scss`, `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts`.
- Keep touch targets at least 44x44 and keyboard activation parity for utility actions.
- UI Task Ref: UI-TB-005.
