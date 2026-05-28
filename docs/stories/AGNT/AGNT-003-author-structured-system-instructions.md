# AGNT-003 Author Structured System Instructions

Story ID: AGNT-003
Module Prefix: AGNT
Priority: Medium
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-profiles/*; src/app/models/agent-profile.model.ts; src/reference/tech-folder/SYSTEM_INSTRUCTIONS.md
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Author Structured System Instructions

User Statement: As a user refining personas, I want to author system instructions in plain text, form mode, or XML so that I can work at the level of structure I prefer.

Acceptance Criteria:

- Users can switch between plaintext, structured form, and XML instruction modes.
- Structured fields can generate XML without dropping semantic sections.
- Valid XML can be parsed back into structured fields.
- AI-assisted conversion from plain text produces reviewable structured output.

data-test-id:

- system-mode-plaintext
- system-mode-form
- system-mode-xml
- system-convert-action
- system-editor-save
