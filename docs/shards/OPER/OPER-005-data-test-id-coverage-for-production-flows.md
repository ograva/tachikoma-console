# OPER-005 data-test-id Coverage for Production Flows

| Field | Value |
| :--- | :--- |
| **Shard ID** | OPER-005 |
| **Module** | OPER - Cost, Limits, and Runtime Transparency |
| **Story Ref** | None |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | None |

## Description

Harden UI automation reliability by adding complete data-test-id coverage to interactive controls and state containers in critical user flows. This shard ensures selectors are stable and non-brittle for Playwright coverage across chat, profiles, auth, dashboard, and user profile screens. Naming must follow project conventions and remain semantically clear.

## Acceptance Criteria

- [ ] All interactive controls in listed production surfaces have stable data-test-id attributes.
- [ ] Major state containers for loading, empty, and error scenarios include test hooks.
- [ ] data-test-id naming convention follows `page-element-purpose` consistently.

## Test Coverage

- [ ] Unit: Template-level selector convention validation where helper utilities exist, with dependent config services mocked.
- [ ] E2E: Playwright smoke suite targets primary flows exclusively via data-test-id selectors (T527-T534).

## Dev Notes

- Touch points: `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`, `src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html`, `src/app/pages/profile/profile.component.html`, `src/app/pages/authentication/side-login/side-login.component.html`, `src/app/pages/authentication/side-register/side-register.component.html`, `src/app/pages/starter/starter.component.html`.
- Apply selectors to interactive elements and major state containers only; avoid decorative-only hooks.
- UI Task Ref: UI-TB-008.
