# CONSTRAINTS.md

| Version | Status | Date | Owner |
| :---- | :---- | :---- | :---- |
| 1.2 | Draft | 2026-05-29 | Watson (Architect) |

## 1. Purpose

This document defines the architectural and implementation constraints for Stand Alone Chat (SAC). It is the primary guardrail for future PRD, Architecture, and implementation work.

The rules below reflect the live codebase, the current dependency baseline, and the intended product direction: an Angular-first, client-heavy, PWA-capable workspace with optional Firebase-backed sync.

## 2. Core Platform Constraints

### Frontend Framework

- Use Angular 20 as the application framework.
- Prefer standalone components and feature-scoped services.
- Do not introduce NgModules for new app features unless a library requires one.
- Keep route-level code split by default.

### Language and Build

- Use TypeScript for all app logic and model definitions.
- Use SCSS for all component and global styling.
- Keep the Angular CLI build pipeline as the primary build system.

### Firebase / Cloud

- Use Firebase Authentication for sign-in, anonymous mode, and optional Google sign-in.
- Use Firestore only as an authenticated cloud sync layer, not as the primary runtime state store.
- Use the compatible Firebase SDK stack already present in the workspace (`firebase` and `@angular/fire` aligned to Angular 20).
- Namespace SAC Firestore collections under `/apps/sac` for shared Firebase projects.

### Google AI / GenAI

- Use `@google/genai` as the Google API client package for Gemini access.
- Prefer the newest supported Gemini model available to the workspace baseline.
- Default model: Gemini 3.5 Flash.
- Allow Gemini 3.1 as an explicit alternative where a stronger or different model is needed.
- Do not hard-code deprecated Gemini 1.x or 2.x models as defaults.

### Approved Supporting Libraries

- Use Angular Material for the base component system.
- Use Angular CDK for interaction primitives, overlays, drag/drop, and accessibility helpers.
- Use Tabler Icons for app icons.
- Use ngx-scrollbar only for custom scroll surfaces that Material does not already solve well.
- Use ngx-translate for localization.

### Conditional Additions

- Use `zod` and/or `@cfworker/json-schema` when runtime validation is needed for model output, persisted payloads, or Firestore sanitization.
- Use `ng-apexcharts` only when a chart is needed and Material-native visualization is insufficient.

## 3. PWA and Responsive Design Constraints

- The app must be a Progressive Web App.
- Service worker support must remain enabled for production builds.
- The app must be responsive for mobile, tablet, and desktop.
- Layout decisions should prioritize graceful scaling rather than device-specific forks.
- Offline-first behavior should be preserved for existing local data.

## 4. State, Persistence, and Sync Constraints

- Use localStorage as the immediate write target for user state and chat state.
- Forward changes to Firestore asynchronously when the user is authenticated.
- Preserve the current local-first user experience even if cloud sync fails.
- Normalize data on read and sanitize data on write.
- Do not write `undefined` values to Firestore.
- Store API keys in plaintext only in localStorage; encrypt them before Firestore upload.
- Treat Firestore documents as per-user scoped.

## 5. AI / Conversation Constraints

- Multi-agent chat orchestration must remain client-side unless a future decision explicitly changes the architecture.
- Keep the current round-robin protocol model as the base behavior.
- Preserve the silence protocol concept, but document exact matching behavior and its limitations.
- Track round/context state explicitly when it affects conversation reconstruction.
- Failed persona steps must be shown explicitly in transcript UX after bounded retry exhaustion; silent skipping is prohibited.

## 6. Data Model Constraints

- The TypeScript model files under `src/app/models` are the canonical contract source.
- All persisted entities should be normalized into those model shapes.
- `createdAt` and `updatedAt` must be preserved for syncable entities, even when a base interface only requires `updatedAt`.
- Treat chat session snapshots as historical records of the participating agent roster.
- Do not mutate historical chat state when agent profiles change later.

## 7. UI / UX Library Constraints

### Required Libraries

- Use Angular Material as the primary UI component library.
- Use Angular CDK for foundational UI behavior where needed.
- Use Tabler Icons for iconography, consistent with the current app shell.
- Use ngx-scrollbar only where custom scroll behavior is required.
- Use ngx-translate for localization support.

### Styling Direction

- Prefer custom SCSS and app-owned themes over imported template kits.
- Keep Material as the base design system, but allow custom theming for the cyberpunk visual identity.
- Use Sass utilities and shared style tokens for consistency.

### Recommended Additions

- Consider `class-variance-authority` or a similar utility only if a component-variant pattern becomes hard to maintain with SCSS alone.
- Consider `zod` and/or `@cfworker/json-schema` as the preferred runtime validation tools for structured model output and Firestore payload normalization.
- Consider `ng-apexcharts` only for dashboard-style visualizations that cannot be expressed cleanly with standard Material components.

### Not Recommended Unless Explicitly Approved

- Bootstrap.
- Tailwind CSS as a parallel styling system.
- Large template/theme marketplaces that overwrite the current visual language.
- A second component library that competes with Angular Material.

## 8. Performance Constraints

- Keep first-load and route-load performance within a reasonable SPA budget.
- Avoid blocking cloud calls on the critical render path.
- Treat token, rate-limit, and quota handling as part of runtime performance policy.
- Keep chat orchestration efficient enough for multi-agent use without moving the app to a backend-heavy design.

## 9. Security Constraints

- Assume browser storage is not a secure secret vault.
- Encrypt cloud-synced API keys before write.
- Validate and sanitize user-supplied API keys and prompt content where relevant.
- Keep user data isolated by Firebase auth context.
- Avoid introducing new secret storage mechanisms without an explicit architecture decision.

## 10. Prohibited Patterns

- Do not switch the app to a backend-first architecture without an explicit decision.
- Do not reintroduce deprecated Gemini defaults.
- Do not bypass the model layer and persist arbitrary shapes directly.
- Do not introduce additional UI frameworks by default.
- Do not treat Firestore as the primary online-only source of truth.
- Do not store unencrypted cloud API keys.

## 11. Open Questions

- Should Gemini 3.5 Flash remain the default if a later 3.x model becomes available and stable?
- Should the app ever support a second AI provider, or remain Gemini-only by design?
- Should a separate decision be required before adding any new styling framework beyond Angular Material and SCSS?

## 12. Source of Truth Priority

1. [CONSTRAINTS.md](CONSTRAINTS.md) defines the current guardrails.
2. [Architecture.md](Architecture.md) describes the current architecture within those guardrails.
3. [CanonicalDataModelSpec.md](CanonicalDataModelSpec.md) defines the persisted model shapes within those guardrails.
4. [PRD.md](PRD.md) describes product intent and must not contradict the higher-priority documents.
