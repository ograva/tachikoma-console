# AGNT-005 Replace Browser Dialogs with Material Dialogs

| Field | Value |
| :--- | :--- |
| **Shard ID** | AGNT-005 |
| **Module** | AGNT - Agent Profiles and Instruction Design |
| **Story Ref** | None |
| **Priority** | Medium |
| **Status** | Not Started |
| **Complexity** | S |
| **Depends On** | AGNT-001 |

## Description

Replace native browser alert and confirm interactions in the profile configuration flow with Angular Material dialogs. This shard standardizes destructive and validation feedback patterns for better accessibility and visual consistency. Dialog behavior must remain deterministic and keyboard-operable.

## Acceptance Criteria

- [ ] Native alert/confirm usage in agent profile flows is replaced by Material dialog components.
- [ ] Destructive actions require explicit confirmation with clear primary and secondary choices.
- [ ] Dialog focus trap, escape handling, and focus return behavior are implemented consistently.

## Test Coverage

- [ ] Unit: Dialog invocation and confirmation branch logic in profile component with dependent services mocked.
- [ ] E2E: Profile destructive and validation dialog flows with keyboard and pointer interactions (T125-T130).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-profiles/tachikoma-profiles.component.ts`, `src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html`.
- Use Angular Material dialog primitives only; avoid introducing alternate dialog systems.
- UI Task Ref: UI-TB-010.
