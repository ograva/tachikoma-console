---
name: cohort
description: Report where the project stands in the 10-phase cohort workflow (Mary → Jason → Watson → Eunice → Poe → Quinn → Athena → Quinn) for each module, list the blockers, and recommend the next handoff. Use when the owner asks "where are we", "what's next", or which agent should pick up a request.
argument-hint: "[module PREFIX | request to route]"
---

# /cohort: workflow status and routing

This command is read-only: report status, don't change any files.

1. Read the *Cohort Workflow* section of `CLAUDE.md`.
2. Gather the evidence:
   - Versions and dates from the tables at the top of `docs/context/ProjectBrief.md`, `PRD.md`, `Architecture.md` and `UI_UX_Design_Guide.md`, and the latest `DECISION_LOG.md` entry.
   - The PREFIX modules in the PRD, and for each: the story files in `docs/stories/<PREFIX>/`, wireframes and flows in `docs/context/designs/`, shard files and their `BACKLOG.md` status, and tests (the summary table in `docs/testing/TEST_REGISTRY.md`; run `npm run -s test:registry:check` first).
   - Open work: shards marked `In Progress` or `Ready for Review`, and any shard whose `Depends On` isn't complete.
3. Output one table: | Module | Stories | Wireframes / flows | Shards (done/total) | Tests | Current phase | Blocker | Next handoff |. Base every cell on a file you read. Write "none" when something is missing; don't guess.
4. Flag pipeline breaks: shards with no story, UI shards with no wireframe, shards with no tests in their T-range, stories with no shard, and a PRD newer than Architecture (Phase 4 needed).
5. If `$ARGUMENTS` is a request rather than a PREFIX, route it: is it a new feature (`/jason`), a change of direction (`/mary`), a design gap (`/eunice`), an implementation deviation (the `watson` subagent), or a shard to build (the `athena` subagent)? Say which phase it enters and why, in one or two sentences.
6. End with a single recommended next action. Don't start it.
