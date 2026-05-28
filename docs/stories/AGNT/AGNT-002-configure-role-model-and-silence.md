# AGNT-002 Configure Role, Model, And Silence

Story ID: AGNT-002
Module Prefix: AGNT
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-profiles/*; src/app/models/agent-profile.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Configure Role, Model, And Silence

User Statement: As a user, I want to control how each agent behaves in the protocol so that responses feel distinct and useful.

Acceptance Criteria:

- Each agent supports chatter or moderator role assignment.
- Each agent supports a selected model or a documented fallback behavior.
- Each agent supports a silence protocol mode.
- Invalid or unsupported combinations are prevented or clearly explained before save.
- Model choices must stay within the Gemini baseline allowed by the constraints document.

data-test-id:

- profile-role-select
- profile-model-select
- profile-silence-mode-select
- profile-validation-message
