# ORCH-003 Share Chat And File Context

Story ID: ORCH-003
Module Prefix: ORCH
Priority: Medium
Implementation Status: Partial
Architecture Component: src/app/pages/tachikoma-chat/*
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Share Chat And File Context

User Statement: As a user, I want all participating agents to receive shared chat context and uploaded file context so that responses stay grounded in the same inputs.

Acceptance Criteria:

- Chat description is included in the conversation context for agent calls.
- Uploaded text-based file content is available to all participating agents.
- Context construction follows a documented order that avoids silent omission of user inputs.
- Unsupported or invalid files fail safely without crashing the protocol.
- Context sharing is owned by the chat page for now; service extraction is an architecture follow-up, not a blocker for this story.

data-test-id:

- chat-description-context
- file-upload-input
- file-upload-list
- file-upload-error
