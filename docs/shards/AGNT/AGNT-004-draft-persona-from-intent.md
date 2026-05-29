# AGNT-004 Draft Persona from Intent

| Field | Value |
| :--- | :--- |
| **Shard ID** | AGNT-004 |
| **Module** | AGNT - Agent Profiles and Instruction Design |
| **Story Ref** | AGNT-004 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #45 |
| **Complexity** | M |
| **Depends On** | AGNT-001 |

## Description

Implement AI-assisted persona drafting from freeform intent as the default onboarding path for persona creation. This shard reduces setup friction and aligns AGNT with v1.3 immediate baseline requirements. Drafts must be reviewable, editable, and safely normalized before save.

## Acceptance Criteria

- [ ] Users can enter intent text and generate a draft profile with required core fields.
- [ ] Draft output can be saved directly or opened in advanced editing mode.
- [ ] Invalid or incomplete draft output is normalized or rejected with actionable feedback.

## Test Coverage

- [ ] Unit: Draft parsing/normalization logic with malformed output handling and fallback cases.
- [ ] E2E: Intent-to-draft workflow with save and advanced-edit branching (T119-T124).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-profiles/*`, `src/app/services/agent-profile.service.ts`, `src/app/models/agent-profile.model.ts`.
- Maintain deterministic defaults for role, model, and silence mode when missing.
- UI Task Ref: UI-TB-011.


