# CHAT-001 Start A New Chat With Context

Story ID: CHAT-001
Module Prefix: CHAT
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/models/chat-session.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Start A New Chat With Context

User Statement: As a user, I want to create a new chat with a title, description, and selected agents so that the conversation starts with the right scope.

Acceptance Criteria:

- New chat creation supports optional title and description fields.
- Users can select the participating agent roster before the first message.
- At least one agent is required to create a valid chat.
- Chat description is included as shared context for later agent calls.

data-test-id:

- new-chat-action
- new-chat-title-input
- new-chat-description-input
- new-chat-agent-selector
- new-chat-create-submit
