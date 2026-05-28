# AGNT-001 Create And Edit Agent Profiles

Story ID: AGNT-001
Module Prefix: AGNT
Priority: High
Implementation Status: Existing
Architecture Component: src/app/pages/tachikoma-profiles/*; src/app/services/agent-profile.service.ts; src/app/models/agent-profile.model.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Create And Edit Agent Profiles

User Statement: As a power user, I want to create and edit custom agent profiles so that I can tailor the conversation team to my workflow.

Acceptance Criteria:

- Users can create a profile with name, role, color, model, and system instruction.
- Users can edit existing profiles and save changes successfully.
- Product-governed default agents are protected according to current app rules.
- Profile changes persist locally and sync to cloud when authenticated.

data-test-id:

- profile-create-action
- profile-name-input
- profile-role-select
- profile-model-select
- profile-save-action
