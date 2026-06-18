# CLAUDE.md - Tachikoma Console

Purpose: Guide Claude Code to operate within the Tachikoma Console (SAC) Agentic Workflow.

## Project Identity
- **Name:** Tachikoma Console (SAC)
- **Identity:** Futuristic, Stand Alone Complex inspired AI orchestration console.
- **Stack:** Angular 20, Firebase (Auth/Firestore/Storage), SCSS, Playwright.

## Agentic Workflow
The project is managed by specialized agents defined in `.claude/agents/`.
- **Mary (Analyst):** Strategy and Project Brief.
- **Jason (PM):** PRD and User Stories.
- **Watson (Architect):** Technical Design and Architecture.
- **Poe (PO):** Sharding and Backlog Management.
- **Athena (Lead Dev):** Implementation and DevOps.
- **Quinn (QA):** Testing and Quality Gating.
- **Eunice (Designer):** UI/UX and Design System.

## Monorepo Reality
- **App:** Angular standalone components.
- **State:** Angular Signals.
- **Styling:** SCSS (Material 21 + Tailwind 4).
- **Database:** Dedicated SAC Firestore database (isolation required).
- **E2E:** Playwright against local emulators.

## Canonical Commands
### Development
- `npm start` - Start dev server
- `npm run start:local` - Start with local configuration
- `npm run dev` - App + Emulators (Local Stack)

### Firebase & Emulators
- `npm run firebase:emulators` - Start local emulators (Auth, Firestore, Storage)
- `npm run firebase:emulators:seed` - Seed emulators with test data
- `npm run firebase:emulators:reset` - Wipe emulator state

### Testing
- `npm test` - Run unit tests (Karma/Jasmine)
- `npm run test:e2e` - Run all Playwright tests
- `npm run test:e2e:ui` - Playwright UI mode
- `npm run test:e2e:smoke` - Run smoke tests (@smoke)

### Athena (Automation)
- `npm run athena:blast-issues` - Create GitHub Issues from shards
- `npm run athena:sync-project` - Sync Issues to Project Board
- `npm run athena:reconcile` - Reconcile local backlog with GitHub

## Guardrails
- **CONSTRAINTS.md:** ALWAYS follow the project constraints.
- **Local-First:** Keep writes local-first; sync to cloud asynchronously.
- **Data Attributes:** Use `data-test-id` for all interactive elements.
- **Firestore:** Never write `null` or `undefined`. Use DAT-302 serialization.
- **Security:** Do not commit API keys. Use `.env` or environment files.

## When You Need to Modify App Code for Testability

- Keep app behavior unchanged; only improve observability and selector stability.
- Add `data-test-id` attributes with module-prefixed names.
- Avoid broad refactors while doing E2E enablement.
- Mention each UI testability change in the final summary.

## Commit/PR Hygiene

- Group changes logically: helpers, specs, scripts, then docs.
- Include run commands used and result summary (pass/fail counts).
- Call out known residual risks or intentionally deferred flaky tests.
