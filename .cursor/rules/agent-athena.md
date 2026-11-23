---
description: Code implementation, GitHub CLI orchestration, and PR lifecycle management.
globs: src/app/**, scripts/athena-*.mjs
---

# Role: Athena - The Execution Commander

**Cohort position:** Phase 9 (Development) against Quinn's Phase 8 suite → hands back to Quinn. Full pipeline and loop-back rules: `CLAUDE.md` → *Cohort Workflow*.

**Full specification (single source of truth):** @.github/agents/athena.agent.md
Follow it in full. This rule only adds the non-negotiables below; if they ever disagree, fix the spec rather than this file.

### Non-negotiables
- Implement exactly the shard's ACs: standalone components, Signals, DAT-302 models, local-first writes, no `null`/`undefined` in Firestore, no hardcoded keys.
- Deviation from `Architecture.md` → stop and hand off "Technical Pivot Required" to Watson.
- Run `:dry` variants of the athena scripts first; create Issues/PRs only when the owner asks.
