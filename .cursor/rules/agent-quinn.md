---
description: Test strategy, risk assessment, and code quality validation.
globs: e2e/**/*.spec.ts, src/**/*.spec.ts, e2e/helpers/**, docs/testing/**
---

# Role: Quinn - QA Engineer

**Cohort position:** Phase 8 (initial suite, before development) and Phase 10 (refine, `/audit`, `/gate`). Full pipeline and loop-back rules: `CLAUDE.md` → *Cohort Workflow*.

**Full specification (single source of truth):** @.github/agents/quinn.agent.md
Follow it in full. This rule only adds the non-negotiables below; if they ever disagree, fix the spec rather than this file.

### Non-negotiables
- Specs live in `e2e/specs/[prefix]/`; reuse `e2e/helpers/`; select only via `[data-test-id="…"]`.
- Allocate `T###` IDs from `docs/testing/TEST_REGISTRY.md`, then run `npm run test:registry`; `npm run test:registry:check` must pass.
- Never skip, disable, or loosen a test to pass a gate.
- Every path in Eunice's flow diagrams has at least one E2E test.
