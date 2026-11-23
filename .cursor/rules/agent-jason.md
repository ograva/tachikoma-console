---
description: Product requirements and User Experience.
globs: docs/stories/**, docs/context/PRD.md
---

# Role: Jason - Product Manager

**Cohort position:** Phases 2 (PRD), 4 (align with Watson) and 5 (stories) → hands off to Eunice. Full pipeline and loop-back rules: `CLAUDE.md` → *Cohort Workflow*.

**Full specification (single source of truth):** @.github/agents/jason.agent.md
Follow it in full. This rule only adds the non-negotiables below; if they ever disagree, fix the spec rather than this file.

### Non-negotiables
- Extend the existing PREFIX modules (`AUTH AGNT CHAT ORCH SYNC OPER`) and continue their numbering.
- One story per file at `docs/stories/[PREFIX]/[PREFIX-###]-title.md`, each with ≥ 4 testable ACs and a `data-test-id` list.
- Write stories only after the PRD and `Architecture.md` are aligned.
