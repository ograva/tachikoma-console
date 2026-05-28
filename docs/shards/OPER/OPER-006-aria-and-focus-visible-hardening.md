# OPER-006 Aria and Focus-Visible Hardening

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-006 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | None |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | None |

## Description

Improve accessibility fidelity by adding explicit aria labeling and consistent focus-visible treatment on icon-only and custom controls. This shard targets chat, profiles, and profile surfaces first, then supports broader pass-through consistency. It ensures keyboard and assistive technology users can navigate critical interactions with confidence.

## Acceptance Criteria

- [ ] Icon-only controls include explicit aria-label values that describe user intent.
- [ ] Custom interactive controls expose a consistent visible focus treatment during keyboard navigation.
- [ ] Keyboard traversal across critical actions remains complete and predictable without pointer input.

## Test Coverage

- [ ] Unit: Accessibility-related control metadata and focus state class application logic with component dependencies mocked.
- [ ] E2E: Keyboard-only and screen-reader-smoke flows validating aria labels and visible focus paths (T535-T542).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`, `src/app/pages/tachikoma-chat/tachikoma-chat.component.scss`, `src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html`, `src/app/pages/tachikoma-profiles/tachikoma-profiles.component.scss`, `src/app/pages/profile/profile.component.html`.
- Align focus-visible styles with shared token system and avoid color-only status cues.
- UI Task Ref: UI-TB-009.
