# CHAT-003 Export Conversation Records

Story ID: CHAT-003
Module Prefix: CHAT
Priority: Medium
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-chat/*
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Export Conversation Records

User Statement: As a user, I want to export a conversation so that I can share, archive, or review it outside the app.

Acceptance Criteria:

- Users can export a chat in plain text and PDF formats.
- Export output preserves message order, timestamps, and speaker attribution.
- Export filenames are sanitized for filesystem safety.
- Export actions do not mutate the current chat session.

data-test-id:

- chat-export-menu
- chat-export-text
- chat-export-pdf
- chat-export-status
