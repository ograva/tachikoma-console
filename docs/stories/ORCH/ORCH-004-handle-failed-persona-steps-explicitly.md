# ORCH-004 Handle Failed Persona Steps Explicitly

Story ID: ORCH-004
Module Prefix: ORCH
Priority: High
Implementation Status: Gap
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/models/chat-message.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Handle Failed Persona Steps Explicitly

User Statement: As a user, I want failed persona responses to be shown clearly in the transcript so that I can trust the protocol state and continue safely.

Acceptance Criteria:

- When a persona call fails, SAC retries once using reduced context according to policy.
- If retry fails, SAC renders an explicit failed persona step in the transcript.
- Failed steps include user-facing failure messaging and do not silently disappear.
- Protocol execution continues deterministically for remaining personas unless a hard-stop policy is triggered.

data-test-id:

- persona-step-failed-card
- persona-step-retry-status
- persona-step-failure-message
- protocol-continue-after-failure
