# UI Implementation Task Board (File and Component Mapped)

## Version History

| Version | Date | Author | Summary of Changes |
| :---- | :---- | :---- | :---- |
| v1.0 | 2026-05-29 | Eunice (UI UX Designer) | Initial implementation-ready UI task board aligned to SAC theme v1.1 and chat UX concerns. |

## Purpose

This task board translates theme and UX findings into implementation-ready engineering and QA work items for Poe to shard.

## Priority Legend

- P0: Critical user-flow blocker
- P1: High-impact usability and accessibility
- P2: Quality and polish

## Epic A: Chat Readability and Scroll Control

### UI-TB-001 (P0) Smart autoscroll mode and reading lock

- Problem: Users lose reading position while personas continue writing.
- Components:
  - TachikomaChatComponent
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.ts
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
- Implementation:
  - Add scroll mode state with values: follow-latest and reading-lock.
  - Default to follow-latest until user manually scrolls up.
  - When user scrolls above threshold, switch to reading-lock and stop forced scroll.
  - Show non-intrusive "New messages" chip with count while locked.
  - Add "Jump to Latest" action that restores follow-latest and snaps to newest content.
- Acceptance criteria:
  - User can read older messages without forced repositioning.
  - New messages continue rendering while preserving viewport in reading-lock.
  - One-tap action returns to latest message region.
- QA checks:
  - Mobile and desktop behavior parity.
  - No jitter during rapid persona updates.
  - Keyboard navigation can activate jump action.

### UI-TB-002 (P0) Round jump navigator for long conversations

- Problem: Long chats are hard to navigate quickly.
- Components:
  - TachikomaChatComponent
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.ts
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
- Implementation:
  - Add round anchors in transcript model rendering.
  - Add side jump rail on desktop and compact bottom sheet navigator on mobile.
  - Navigator mode options: every round or every 3 rounds.
  - Click or tap anchor jumps to round section with smooth scroll.
- Acceptance criteria:
  - User can jump to any anchor in one interaction.
  - Navigator remains usable for 200 plus messages.
  - Current visible round is highlighted in navigator.
- QA checks:
  - Anchors remain correct after chat restore and route re-entry.
  - No overlap with drawer controls on narrow screens.

### UI-TB-003 (P1) Response length control (short medium long)

- Problem: Response verbosity is not user-tunable from chat UI.
- Components:
  - TachikomaChatComponent
  - UserProfileService (for persisted preference)
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.ts
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
  - src/app/services/user-profile.service.ts
  - src/app/models/user-profile.model.ts
- Implementation:
  - Add response length selector with values short medium long.
  - Persist preference per user profile and local-first fallback.
  - Inject selected length into persona prompt framing consistently.
- Acceptance criteria:
  - Selector is visible and understandable before send.
  - Preference survives reload and sign-in resume.
  - Output length trend follows selection without protocol breakage.
- QA checks:
  - Works in anonymous and authenticated modes.
  - Does not regress token usage safeguards.

### UI-TB-004 (P1) Compact metrics mode for mobile

- Problem: Top metrics consume too much vertical space on small displays.
- Components:
  - TachikomaChatComponent
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.ts
- Implementation:
  - Replace expanded metrics block on mobile with collapsed summary row.
  - Add expandable diagnostics drawer or sheet for full details.
  - Keep critical warning state visible as compact badge.
- Acceptance criteria:
  - Initial viewport on smartphone shows more transcript and composer area.
  - Warnings remain visible without opening diagnostics.
  - Diagnostics remain accessible within one interaction.
- QA checks:
  - Validate on 375x667 and 390x844 breakpoints.
  - Verify no clipped controls in landscape orientation.

### UI-TB-005 (P2) Sticky transcript utilities

- Problem: User needs fast vertical control during long reads.
- Components:
  - TachikomaChatComponent
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.ts
- Implementation:
  - Add floating utility stack: jump top, jump latest, jump previous unread.
  - Utilities auto-hide when idle and reappear on scroll.
- Acceptance criteria:
  - User can move top/bottom quickly without repetitive swipes.
  - Controls do not obstruct message content.
- QA checks:
  - Touch target size minimum 44x44.
  - Accessible labels and focus-visible states present.

## Epic B: Theme Cohesion Rollout

### UI-TB-006 (P1) Global tokenization and shell alignment

- Problem: Shell and SAC pages still feel like separate visual systems.
- Components:
  - Full layout shell
  - Header and sidebar
- Files:
  - src/assets/scss/style.scss
  - src/assets/scss/themecolors/_orange_theme.scss
  - src/app/layouts/full/full.component.html
  - src/app/layouts/full/header/header.component.html
  - src/app/layouts/full/sidebar/sidebar.component.html
- Implementation:
  - Introduce SAC token variables as canonical styling source.
  - Map existing shell classes to new token roles.
  - Preserve contrast and readability while reducing conflicting accents.
- Acceptance criteria:
  - Shell, auth, dashboard, chat, and profiles present coherent palette and spacing language.
- QA checks:
  - Visual regression snapshots across key routes.

### UI-TB-007 (P1) Auth and dashboard visual parity pass

- Problem: Register and dashboard surfaces drift from chat identity.
- Components:
  - AppSideLoginComponent
  - AppSideRegisterComponent
  - StarterComponent
- Files:
  - src/app/pages/authentication/side-login/side-login.component.html
  - src/app/pages/authentication/side-login/side-login.component.scss
  - src/app/pages/authentication/side-register/side-register.component.html
  - src/app/pages/starter/starter.component.html
- Implementation:
  - Apply shared tone and typography hierarchy.
  - Update copy and labels to current v1.3 model policy and product framing.
- Acceptance criteria:
  - Login and register appear as one family.
  - Dashboard language aligns to current platform behavior.
- QA checks:
  - Copy review against PRD and constraints.

## Epic C: Accessibility and Testability Hardening

### UI-TB-008 (P0) data-test-id coverage for production flows

- Problem: Missing test hooks blocks stable automation and sharding.
- Components:
  - Chat, Profiles, Profile, Auth, Dashboard
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html
  - src/app/pages/profile/profile.component.html
  - src/app/pages/authentication/side-login/side-login.component.html
  - src/app/pages/authentication/side-register/side-register.component.html
  - src/app/pages/starter/starter.component.html
- Implementation:
  - Add data-test-id on all interactive controls and major state containers.
  - Naming convention: page-element-purpose.
- Acceptance criteria:
  - 100 percent coverage for interactive elements in listed screens.
- QA checks:
  - Automation smoke tests can target all primary flows without brittle selectors.

### UI-TB-009 (P0) aria and focus-visible hardening

- Problem: Incomplete accessibility coverage on icon and custom controls.
- Components:
  - Chat and Profiles primarily, then global pass
- Files:
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.html
  - src/app/pages/tachikoma-chat/tachikoma-chat.component.scss
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.scss
  - src/app/pages/profile/profile.component.html
- Implementation:
  - Add explicit aria-label to icon-only controls.
  - Add consistent focus-visible ring styles on custom buttons and controls.
- Acceptance criteria:
  - Keyboard-only users can traverse all critical actions with visible focus.
  - Screen readers announce intent of icon-only controls.
- QA checks:
  - Basic NVDA and VoiceOver smoke pass.

## Epic D: Profile and Configuration Flow Improvements

### UI-TB-010 (P1) Replace browser dialogs with Material dialogs

- Problem: alert and confirm interactions feel inconsistent and inaccessible.
- Components:
  - TachikomaProfilesComponent
- Files:
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.ts
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html
- Implementation:
  - Replace native alert and confirm with Material dialog components.
- Acceptance criteria:
  - All destructive and validation dialogs use consistent Material pattern.
- QA checks:
  - Dialog focus trapping and keyboard dismissal behavior validated.

### UI-TB-011 (P1) Basic-first Agent Studio flow

- Problem: Configuration entry is still expert-first.
- Components:
  - TachikomaProfilesComponent
- Files:
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.ts
  - src/app/pages/tachikoma-profiles/tachikoma-profiles.component.scss
- Implementation:
  - Add default intent-to-draft entry step.
  - Move XML and full field editors behind explicit advanced toggle.
- Acceptance criteria:
  - New user can create first usable persona quickly with minimal fields.
- QA checks:
  - Existing advanced workflow remains available and functional.

## Suggested Shard Groups for Poe

- Shard Group 1 (P0 chat core): UI-TB-001, UI-TB-002
- Shard Group 2 (P0 quality gates): UI-TB-008, UI-TB-009
- Shard Group 3 (P1 chat controls): UI-TB-003, UI-TB-004, UI-TB-005
- Shard Group 4 (P1 theme rollout): UI-TB-006, UI-TB-007
- Shard Group 5 (P1 config UX): UI-TB-010, UI-TB-011

## Dependencies and Sequencing

1. UI-TB-001 before UI-TB-002 and UI-TB-005
2. UI-TB-008 and UI-TB-009 should run in parallel with all UI work and close each shard
3. UI-TB-006 before UI-TB-007 for token consistency
4. UI-TB-003 should coordinate with orchestration prompt framing ownership

## Definition of Done (Board Level)

- Chat reading position remains user-controlled during streaming updates.
- User can jump between rounds quickly in long sessions.
- Response length control is available and persisted.
- Mobile chat viewport prioritizes transcript over diagnostics by default.
- Theme appears consistent across shell, auth, dashboard, chat, profiles, and profile.
- Accessibility and testability baselines are satisfied for all changed screens.
