# AGNT-004 Draft Persona From Intent

Story ID: AGNT-004
Module Prefix: AGNT
Priority: High
Implementation Status: Gap
Architecture Component: src/app/pages/tachikoma-profiles/*; src/app/services/agent-profile.service.ts; src/app/models/agent-profile.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Draft Persona From Intent

User Statement: As a user, I want to describe a persona in plain language and get a ready-to-use draft so that persona creation is fast and non-technical.

Acceptance Criteria:

- Users can enter a freeform persona intent and generate a draft profile.
- Draft output includes name, role, model, silence mode, and system instructions.
- Users can save the draft directly or open advanced editing for refinement.
- Invalid or incomplete draft output is normalized or rejected with actionable feedback.

data-test-id:

- persona-intent-input
- persona-draft-generate
- persona-draft-preview
- persona-draft-save
- persona-open-advanced
