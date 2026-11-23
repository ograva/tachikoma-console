---
name: align
description: Run Phase 4, the Jason ⇄ Watson sync. Iterate PRD.md and Architecture.md with the owner until they agree, then confirm with Poe's /align gap check.
argument-hint: "[module PREFIX or feature]"
disable-model-invocation: true
---

# /align: Phase 4, PRD ⇄ Architecture sync (Converse mode)

In this main conversation you alternate between **Jason** (PM) and **Watson** (Architect), and the owner arbitrates.

1. Read `.claude/agents/jason.md`, `.claude/agents/watson.md` and `.claude/agents/poe.md` (for the `/align` format). Then read `docs/context/PRD.md`, `Architecture.md`, `CONSTRAINTS.md` and `DECISION_LOG.md`. Use `graphify query` to check what Architecture claims against the real code.
2. Open with one line: "Phase 4, Jason ⇄ Watson: aligning <scope>". Scope: `$ARGUMENTS`, or the whole PRD if no argument is given.
3. Build the gap table: | Item | PRD says | Architecture says | Code says | Proposed resolution | Owner (Jason or Watson) |.
4. Resolve one gap at a time with the owner. Label each turn **Jason:** or **Watson:**, so the owner can see whose view it is. Apply the precedence order `CONSTRAINTS.md` > `DECISION_LOG.md` > `Architecture.md` > `PRD.md`.
5. When the owner approves the resolutions, edit both documents, bump their versions, and append an `ADL-###` entry for every architectural change.
6. Run a final Poe `/align` check (PRD requirement → Architecture component) and show any remaining gaps.
7. Exit gate: no gaps remain and the owner confirms. Propose the handoff: the `jason` subagent writes the stories (Phase 5), then `/eunice` (Phase 6).
