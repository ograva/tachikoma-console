# UI UX Design Guide

## Version History

| Version | Date | Author | Summary of Changes |
| :---- | :---- | :---- | :---- |
| v1.4 | 2026-06-18 | Eunice (UI UX Designer) | Added Landscape Roundtable Panel Layout and VS Code-Style Compact Status Bar specifications. |
| v1.3 | 2026-05-29 | Eunice (UI UX Designer) | Added reusable template pack for tasking, sharding, component contracts, QA validation, and theme rollout gating. |
| v1.2 | 2026-05-29 | Eunice (UI UX Designer) | Added implementation-ready task board reference mapped by file and component for Poe sharding. |
| v1.1 | 2026-05-29 | Eunice (UI UX Designer) | Added cohesive SAC theme direction inspired by Ghost in the Shell, including token system, navigation model, component states, and implementation guidance. |
| v1.0 | 2026-05-29 | Eunice (UI UX Designer) | Initial all-screens UX audit of current SAC implementation with severity-ranked findings and recommended fixes. |

## Audit UX All Screens (Current State)

### Scope

This pass audits the current user-facing SAC pages and shell:

- App shell and navigation
- Dashboard
- Authentication Login
- Authentication Register
- Tachikoma Chat
- Tachikoma Profiles
- Profile

### Criteria

Each screen was reviewed against five criteria:

1. Persona alignment
2. Mobile-first compliance
3. Accessibility (WCAG 2.1 AA)
4. Material plus custom styling consistency
5. Testability

### Overall Assessment

- Strength: Distinctive visual identity and high perceived product depth in chat workflows.
- Strength: Rich interaction model (history, export, file context, profile controls, sync utilities).
- Risk: Design and product-policy drift is now the largest UX risk (model naming, dashboard copy, mixed theming).
- Risk: Accessibility and testability are below release-ready baseline for critical workflows.
- Recommendation: Prioritize a hardening sprint before major visual redesign.

### Severity-Ranked Findings

#### Critical

Finding C1: Model policy mismatch across key screens

Screens: Tachikoma Profiles, Dashboard, Chat runtime defaults, Profile defaults.

Evidence: src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html, src/app/pages/starter/starter.component.html, src/app/pages/tachikoma-chat/tachikoma-chat.component.ts, src/app/models/user-profile.model.ts.

Impact: Users see conflicting model options and defaults and lose trust in system behavior.

Recommended fix: Align all visible model labels and defaults to current v1.3 policy in one coordinated update, then expose one canonical model source for UI selectors.

Finding C2: No standardized test hooks in production flows

Screens: Login, Register, Chat, Profiles, Profile, Dashboard.

Evidence: src/app/pages/authentication/side-login/side-login.component.html, src/app/pages/authentication/side-register/side-register.component.html, src/app/pages/tachikoma-chat/tachikoma-chat.component.html, src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html, src/app/pages/profile/profile.component.html, src/app/pages/starter/starter.component.html.

Impact: Reliable end-to-end automation and quality gates are blocked.

Recommended fix: Add data-test-id attributes to all interactive controls using page-element-purpose convention.

#### High

Finding H1: Action buttons missing explicit accessible labels in critical chat UI

Screens: Tachikoma Chat.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.html.

Impact: Screen-reader affordance is incomplete on icon-only controls.

Recommended fix: Add aria-label for all icon-only and context-sensitive buttons, and ensure labels reflect outcome.

Finding H2: Mobile layout fragility from viewport-locked height and aggressive overflow clipping

Screens: Tachikoma Chat.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.scss.

Impact: Risk of clipped content, awkward scroll zones, and control occlusion on small devices.

Recommended fix: Replace fixed viewport math with container-aware min-height strategy and audit overflow rules section by section.

Finding H3: Mixed visual system between shell and SAC pages

Screens: App shell, Chat, Profiles, Auth.

Evidence: src/app/layouts/full/full.component.html, src/assets/scss/themecolors/_orange_theme.scss, src/app/pages/tachikoma-chat/tachikoma-chat.component.scss, src/app/pages/tachikoma-profiles/tachikoma-profiles.component.scss, src/app/pages/authentication/side-login/side-login.component.scss.

Impact: Product feels visually split and less intentional.

Recommended fix: Define one SAC theme token layer that maps shell, auth, dashboard, and chat/profile pages to the same palette roles.

Finding H4: Browser alert and confirm dialogs in profile editing flows

Screens: Tachikoma Profiles.

Evidence: src/app/pages/tachikoma-profiles/tachikoma-profiles.component.ts.

Impact: Interaction quality drops versus Material-based UX; accessibility and consistency suffer.

Recommended fix: Replace browser dialogs with Material dialog patterns including explicit titles, body text, and primary-secondary actions.

#### Medium

Finding M1: Persona onboarding path in profiles is still expert-heavy

Screens: Tachikoma Profiles.

Evidence: src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html.

Impact: New users face configuration friction before first success.

Recommended fix: Introduce a default describe-intent first step, then progressive reveal advanced form/xml/plaintext editors.

Finding M2: Dashboard copy and CTAs communicate outdated capabilities

Screens: Dashboard.

Evidence: src/app/pages/starter/starter.component.html.

Impact: Expectation mismatch and narrative drift from current architecture and product baseline.

Recommended fix: Refresh card copy and getting-started steps to current model policy, profile flow, and dedicated-database sync messaging.

Finding M3: Auth visual parity mismatch between login and register

Screens: Authentication Login, Authentication Register.

Evidence: src/app/pages/authentication/side-login/side-login.component.html, src/app/pages/authentication/side-login/side-login.component.scss, src/app/pages/authentication/side-register/side-register.component.html.

Impact: Registration feels like a different product surface.

Recommended fix: Apply shared auth shell styles and logo treatment across both screens.

Finding M4: Keyboard focus treatment is not consistently explicit in custom controls

Screens: Chat, Profiles.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.scss, src/app/pages/tachikoma-profiles/tachikoma-profiles.component.scss.

Impact: Lower keyboard discoverability and WCAG risk.

Recommended fix: Add consistent focus-visible states for all custom button and input classes.

Finding M5: Heavy use of deep style overrides increases maintenance risk

Screens: Chat, Login.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.scss, src/app/pages/authentication/side-login/side-login.component.scss.

Impact: Theme updates can regress unexpectedly.

Recommended fix: Reduce deep overrides where possible and centralize theme variables in scoped layer files.

Finding M6: Dense chat metrics panel may overload non-expert users

Screens: Tachikoma Chat.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.html.

Impact: Cognitive load competes with core messaging task.

Recommended fix: Keep compact default summary and move advanced counters into expandable diagnostics panel.

#### Low

Finding L1: Terminology consistency opportunities in labels and section names

Screens: Dashboard, Profiles, Chat.

Evidence: src/app/pages/starter/starter.component.html, src/app/pages/tachikoma-profiles/tachikoma-profiles.component.html, src/app/pages/tachikoma-chat/tachikoma-chat.component.html.

Impact: Minor comprehension friction.

Recommended fix: Normalize naming set for agents, profiles, protocol states, and sync actions.

Finding L2: Some touch targets are likely near minimum on dense mobile headers

Screens: Chat.

Evidence: src/app/pages/tachikoma-chat/tachikoma-chat.component.html, src/app/pages/tachikoma-chat/tachikoma-chat.component.scss.

Impact: Minor but noticeable mobile ergonomics risk.

Recommended fix: Enforce minimum 44 by 44 target sizing for compact icon clusters.

### Screen-by-Screen Scorecard

Legend: Pass, Partial, Fail

| Screen | Persona Alignment | Mobile First | Accessibility | Material Consistency | Testability | Notes |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| App shell and navigation | Partial | Partial | Partial | Partial | Fail | Structure is solid but theme consistency and test hooks are missing. |
| Dashboard | Partial | Pass | Partial | Pass | Fail | Informative but messaging and model references are stale. |
| Authentication Login | Pass | Pass | Partial | Partial | Fail | Good flow but needs explicit labels and test ids on key controls. |
| Authentication Register | Partial | Pass | Partial | Partial | Fail | Works functionally but visually drifts from login experience. |
| Tachikoma Chat | Pass | Partial | Partial | Partial | Fail | Feature-rich core screen with strong identity, but needs hardening for a11y and mobile resilience. |
| Tachikoma Profiles | Partial | Partial | Partial | Partial | Fail | Powerful but expert-heavy; browser dialogs reduce UX quality. |
| Profile | Pass | Pass | Partial | Pass | Fail | Good account settings layout with solid states; test hooks still absent. |

### Prioritized Fix Plan (Design and UX)

Phase 1: Foundation hardening (must do first)

- Align model labels and defaults everywhere.
- Add data-test-id map to all production screens.
- Add aria-label and focus-visible coverage for all icon-only actions.

Phase 2: Mobile and accessibility stabilization

- Refactor chat height and overflow strategy.
- Validate touch targets and reading hierarchy at 375px width.
- Add WCAG contrast checks for all neon overlays and low-opacity text.

Phase 3: Flow simplification

- Make profiles start with intent-to-draft path by default.
- Move advanced system instruction modes behind an explicit advanced toggle.
- Replace browser alerts and confirms with Material dialogs.

Phase 4: Visual coherence pass

- Unify shell, auth, dashboard, and SAC pages under one tokenized theme.
- Normalize component emphasis tiers for primary, secondary, and destructive actions.

### Exit Criteria For Next Audit Pass

- All critical findings resolved.
- At least 80 percent of high findings resolved.
- 100 percent of interactive controls include data-test-id.
- 100 percent of icon-only buttons include explicit accessible labeling.
- Mobile audit shows no clipping or unreachable controls on chat and profiles screens.

## Theme Direction v1.1 (SAC Identity)

### Narrative Intent

The current visual spirit is strong and worth preserving. The best next move is not a reset, but a systemization of what is already resonant:

- Night-city tactical mood from Stand Alone Complex.
- Machine precision layered with emergent identity.
- Calm, high-readability command surfaces over decorative noise.

The theme should feel like a professional cybernetic workstation, not a retro game HUD.

### Emotional Direction

- Surgical
- Reflective
- High-trust
- Futuristic
- Human-in-the-loop

### Visual Pillars

Pillar 1: Luminous restraint.

- Use glow as semantic emphasis, not everywhere.
- Keep default surfaces low-noise and low-contrast.

Pillar 2: Identity through role color.

- Agent identity colors are functional and should remain stable across chips, cards, and status bars.

Pillar 3: Operational clarity first.

- Every panel must prioritize legibility, hierarchy, and state feedback.

Pillar 4: Motion as signal.

- Motion should indicate state transition, processing, or confidence change.

## Navigation Model (Configuration <-> Chat)

### IA Recommendation

Use a persistent two-layer navigation model:

- Layer 1 (Primary): Dashboard, Chat, Agents, Profile
- Layer 2 (Contextual subnav):
  - Chat: Active Session, History, Exports
  - Agents: Basic Draft, Advanced Editor, Templates
  - Profile: API and Model, Sync, Account

### Quick Switch Pattern

Add a sticky Workspace Switcher in header and mobile bottom bar:

- Primary action: Jump to Chat
- Secondary action: Jump to Agents
- Preserve unsaved context with a dirty-state prompt before route changes

### Suggested Navigation Labels

- Chat Protocol
- Agent Studio
- User Console
- Session Archive

These labels better match the narrative tone while remaining understandable.

## Component Tone and Behavior

### Buttons

- Primary: solid electric cyan on dark slate base for commit actions.
- Secondary: outlined cool gray for neutral actions.
- Tertiary/icon: transparent with clear focus ring.
- Destructive: magenta-red outlined state only, filled on confirm dialogs.

### Cards and Panels

- Default panel: matte graphite with subtle border.
- Active/selected panel: add 1px luminous edge and 4 percent tinted fill.
- Avoid heavy blur and heavy drop shadows as default.

### Forms

- Input backgrounds stay matte and quiet.
- Focus state should rely on ring and border shift, not bright fill.
- Validation messages use clear icon plus text, no color-only signaling.

### Agent Messages

- Keep identity color in header stripe, icon, and name.
- Message body text stays neutral to preserve readability.
- Failed-step transcript cards must be visually distinct but not alarming by default.

## Theme Tokens

### CSS Variable Block

```css
:root {
  /* Core palette */
  --color-bg: #080b12;
  --color-surface-1: #0f1420;
  --color-surface-2: #151c2b;
  --color-surface-3: #1b2436;
  --color-border: #2a344a;
  --color-border-strong: #3a4967;

  /* Brand and semantic */
  --color-primary: #2dd4ff;
  --color-primary-strong: #00b8eb;
  --color-secondary: #7dd3fc;
  --color-accent: #8b5cf6;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #38bdf8;

  /* Tachikoma identity role colors */
  --color-agent-logikoma: #00e5ff;
  --color-agent-ghost: #ff5ccf;
  --color-agent-moderator: #39ff88;
  --color-agent-neutral: #ffb347;

  /* Typography */
  --font-display: "Share Tech Mono", monospace;
  --font-body: "JetBrains Mono", monospace;

  /* Text hierarchy */
  --text-primary: #e6edf7;
  --text-secondary: #a9b7cc;
  --text-muted: #7f8da3;
  --text-on-primary: #03131a;

  /* Effects */
  --glow-primary-sm: 0 0 8px rgba(45, 212, 255, 0.35);
  --glow-primary-md: 0 0 16px rgba(45, 212, 255, 0.4);
  --ring-focus: 0 0 0 2px rgba(45, 212, 255, 0.65);

  /* Radius and spacing */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Motion */
  --motion-fast: 120ms;
  --motion-base: 220ms;
  --motion-slow: 360ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

### Token Summary

| Token name | Value | Usage example |
| :---- | :---- | :---- |
| color-bg | #080b12 | App shell background |
| color-surface-1 | #0f1420 | Default cards and drawers |
| color-primary | #2dd4ff | Primary action buttons and links |
| color-agent-logikoma | #00e5ff | Logikoma chip, border, status meter |
| color-agent-ghost | #ff5ccf | Ghost chip, border, status meter |
| text-primary | #e6edf7 | Main body text |
| text-secondary | #a9b7cc | Supporting labels and helper text |
| ring-focus | rgba(45, 212, 255, 0.65) | Keyboard focus indicators |
| radius-md | 10px | Cards, dialogs, elevated containers |
| motion-base | 220ms | Drawer and panel transitions |

## Interaction and Motion Principles

- Page entry: quick fade plus 8px vertical settle for content blocks.
- Drawer open and close: use motion-base timing with ease-standard.
- Processing states: pulse or sweep only on active element, never whole page.
- Keep simultaneous animated elements under three in viewport.

## Accessibility Baseline for Theme

- Maintain WCAG 2.1 AA contrast for all body and control text.
- Do not rely on neon color alone to indicate status.
- Focus-visible styles must be explicit on all interactive elements.
- Keep touch targets at minimum 44 by 44 pixels.

## Constraint Conflict and Resolution

Potential conflict:

- Earlier mode guidance references Material plus Tailwind hybrid use.
- Project constraint file prohibits introducing Tailwind as a parallel styling system.

Resolution used for this theme:

- Theme is designed for Angular Material plus app-owned SCSS tokens only.
- No Tailwind dependency is required.

## Implementation Notes (Low-Risk Rollout)

1. Establish tokens in one shared theme file and map existing page variables to it.
2. Update shell and auth first so global coherence is visible immediately.
3. Update chat and profiles next, preserving current role-color semantics.
4. Add focus-visible and aria-label hardening in the same pass as token migration.
5. Ship with a quick visual QA checklist for desktop and mobile before feature work resumes.

## Implementation Task Board Reference

- Primary board for execution planning and sharding:
  - docs/context/designs/TaskBoard_UI_Implementation.md
- Landscape Roundtable Panel Layout & Compact Status Bar Design Contract:
  - docs/context/designs/Landscape_Roundtable_Panel_Layout.md

## Template Pack Reference

- Template index:
  - docs/context/designs/templates/README.md
- Shard template:
  - docs/context/designs/templates/Shard_Template.md
- UI implementation task template:
  - docs/context/designs/templates/UI_Task_Template.md
- Component design contract template:
  - docs/context/designs/templates/Component_Design_Contract_Template.md
- QA validation template:
  - docs/context/designs/templates/QA_UI_Validation_Template.md
- Theme rollout checklist template:
  - docs/context/designs/templates/Theme_Rollout_Checklist_Template.md
