# ORCH-001 Run Round-Robin Agent Cycles

Story ID: ORCH-001
Module Prefix: ORCH
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-chat/*
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Run Round-Robin Agent Cycles

User Statement: As a user, I want SAC to run a structured response cycle across selected agents so that I receive multiple perspectives in one interaction.

Acceptance Criteria:

- User input triggers sequential execution across the selected roster.
- Chatter agents can be processed in randomized order.
- Moderator agents always process after chatter responses.
- Processing state is visible while the cycle is running.
- Persona errors are not silently skipped; failed-step handling is delegated to ORCH-004 policy.

data-test-id:

- chat-message-input
- chat-send-action
- neural-activity-panel
- agent-processing-status
