# OPER-004 Global Tokenization and Shell Alignment

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-004 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | None |
| **Priority** | Medium |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | None |

## Description

Implement global UI tokenization and shell alignment so core application surfaces present a consistent visual system. This shard establishes canonical SAC tokens for shared layout elements including header and sidebar. It reduces cross-screen style drift and improves visual cohesion before downstream parity passes.

## Acceptance Criteria

- [ ] Shared SAC tokens are defined and wired as canonical shell styling inputs.
- [ ] Header, sidebar, and full layout surfaces consume the token system consistently.
- [ ] Core route surfaces render coherent spacing and color language without contrast regressions.

## Test Coverage

- [ ] Unit: Theme/token mapping helpers and style-state utilities where present, with dependent configuration providers mocked.
- [ ] E2E: Visual smoke checks across shell routes confirming token-driven styling consistency (T521-T526).

## Dev Notes

- Touch points: `src/assets/scss/style.scss`, `src/assets/scss/themecolors/_orange_theme.scss`, `src/app/layouts/full/full.component.html`, `src/app/layouts/full/header/header.component.html`, `src/app/layouts/full/sidebar/sidebar.component.html`.
- Preserve Material behavior ownership and use tokens for layout and visual consistency.
- UI Task Ref: UI-TB-006.
