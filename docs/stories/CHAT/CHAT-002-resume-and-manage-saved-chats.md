# CHAT-002 Resume And Manage Saved Chats

Story ID: CHAT-002
Module Prefix: CHAT
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/services/chat-storage.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Resume And Manage Saved Chats

User Statement: As a user, I want to reopen and continue saved chats so that long-running work is not interrupted by page refreshes or device changes.

Acceptance Criteria:

- Saved chats appear in a history surface with identifying metadata.
- Selecting a saved chat restores messages, summary state, and participating agents.
- Users can delete a chat with confirmation.
- Editing chat metadata updates persisted state and the visible list.

data-test-id:

- chat-history-drawer
- chat-history-item
- chat-switch-action
- chat-delete-action
- chat-metadata-save
