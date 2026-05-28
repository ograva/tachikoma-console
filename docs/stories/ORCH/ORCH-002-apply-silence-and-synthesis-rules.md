# ORCH-002 Apply Silence And Synthesis Rules

Story ID: ORCH-002
Module Prefix: ORCH
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/models/agent-profile.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Apply Silence And Synthesis Rules

User Statement: As a user, I want SAC to suppress redundant agent output and produce a coherent synthesis so that conversations stay concise.

Acceptance Criteria:

- Agents can emit a valid silence signal when they have no unique contribution.
- Silence outputs are excluded from the visible transcript.
- Moderator synthesis can incorporate prior agent responses in the same round.
- Silence behavior is traceable through logs or diagnostics.

data-test-id:

- chat-transcript
- moderator-response-card
- agent-response-card
- protocol-diagnostics
