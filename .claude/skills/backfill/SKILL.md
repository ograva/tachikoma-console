---
name: backfill
description: Bring a feature that was built outside the cohort workflow back into it. Starting from the shipped code, cascade as-built documentation through Jason (PRD and story), Watson (Architecture and ADL), Eunice (wireframe and flow), Poe (shard and BACKLOG) and Quinn (tests), touching only the layers that are missing or stale.
argument-hint: "<feature description, file, component or PREFIX>"
disable-model-invocation: true
---

# /backfill: retrofit a shipped feature into the cohort

Use this when an enhancement was developed without going through the Cohort Workflow (CLAUDE.md). The code is the source of truth. The cohort documents are written to describe it **as built**, so the pipeline is complete and traceable again.

Feature: `$ARGUMENTS`

## Ground rules
- **Document, don't redesign.** Every agent records current behaviour. Where the code differs from an older spec, or looks wrong, record it as a **delta or follow-up**. Never change the behaviour silently.
- **No app logic changes.** The only code change allowed is Quinn adding `data-test-id` attributes, using Eunice's ids. If a test exposes a real bug, Quinn marks it `test.fail()` with the bug named, and the bug goes to *Open follow-ups*.
- **The owner approves the plan once, in step 3.** That approval covers the whole cascade. Stop and ask again only if a step finds something that changes the plan: a new PREFIX, a conflict with `CONSTRAINTS.md`, or a bug the owner should hear about now.
- **Track everything** in `docs/context/AGENT_STATUS.md`, following CLAUDE.md → *Agent Status Tracking*.

## 1. Locate the feature (read-only)
- Run `graphify query "<feature>"` first, then `graphify explain` on the main symbol, to find the implementing files, components, services and templates. Read raw files only for the lines the graph points to.
- Note the commit(s) that introduced it (`git log -S` / `git log -- <file>`).
- Summarise in a few lines what it does as built: entry point, UI, data written, conditions.

## 2. Detect which cohort layers are missing or stale
For each layer, search for the feature by name, component and file path, and mark it **present / stale / missing**:

| Layer | Where to look | Owner |
| :--- | :--- | :--- |
| PRD module and story | `docs/context/PRD.md` §3, `docs/stories/<PREFIX>/` | Jason |
| Architecture and decision | `docs/context/Architecture.md`, `docs/context/DECISION_LOG.md` | Watson |
| Wireframe and flow | `docs/context/designs/Wireframe_*.md`, `Flow_*.md`, design guide index | Eunice |
| Shard and backlog | `docs/shards/<PREFIX>/`, `docs/context/BACKLOG.md` | Poe |
| Tests | `docs/testing/TEST_REGISTRY.md`, `e2e/specs/<prefix>/`, unit `*.spec.ts` beside the code | Quinn |

Decide the PREFIX: an existing module (`AUTH AGNT CHAT ORCH SYNC OPER`), or flag that a new module is needed (an owner decision).

## 3. Present the plan and get one approval
Show:
- the as-built summary
- the layer table with its present/stale/missing marks
- the PREFIX and the next free IDs: story, shard, `T###` range from the registry, `ADL-###`
- the agents that will run and in which order (below), skipping layers that are already present
- known deltas against older specs

Ask: "Run this backfill?" Wait for the answer.

## 4. Run the cascade
Add or update one `AGENT_STATUS.md` row per step before it starts.

1. **Jason (story; main session in persona, or the `jason` subagent).**
   - Write `docs/stories/<PREFIX>/<PREFIX-###>-<title>.md` with `Implementation Status: Existing (documented retroactively, as built)`, ≥ 4 acceptance criteria that match what the code does, and the existing `data-test-id`s (missing ones as "Pending Design Gaps").
   - Add a *Follow-ups* section listing deltas and suspected bugs.
   - Add the story to PRD §3 and the journey map if relevant; bump the PRD version.
2. **Watson and Eunice (parallel subagents; they touch different files).**
   - **Watson:** map the feature in `Architecture.md` (components, services, data, signals) and append an `ADL-###` recording the retroactive decision. Bump the version. Update `CONSTRAINTS.md` only if the feature introduced something it governs, and flag that to the owner.
   - **Eunice:** write or refresh the as-built `Wireframe_*.md` / `Flow_*.md` with a full `data-test-id` map and a *Design Gaps* table (final ids for elements without one), then add it to the design guide index.
3. **Poe (`poe` subagent).**
   - Write the retroactive shard (Story Ref, the files from Watson, the UI ref from Eunice, the target spec and `T###` range for Quinn).
   - Add the BACKLOG row. Status is `Ready for Review` until Quinn gates it, or `Completed` / `Done` if passing tests already cover every AC.
   - Update any existing shard or row the feature changed. Supersede shards it replaced; never delete them.
4. **Quinn (`quinn` subagent).**
   - Write E2E tests in the planned `T###` range (tag `@landscape` if layout-specific), plus unit tests for untested logic, and add Eunice's final ids as attribute-only changes.
   - Run the tests against the emulators, run `npm run test:registry` and `:check`, then `/gate` the shard. The gate result sets the final status.

## 5. Verify and close
- `npm run agents:check` (if agent files changed), `npm run test:registry:check`, `npx tsc --noEmit -p e2e/tsconfig.json`.
- **Re-verify id maps:** every id in the new wireframe exists in the templates, and vice versa for this feature.
- Commit each agent's output separately, with run commands and pass/fail counts in the message, plus the matching `AGENT_STATUS.md` update. Push.
- Report a table: layer → artifact → ID → commit. Then list the deltas, bugs and follow-ups added to `AGENT_STATUS.md` *Open follow-ups*, and the gate verdict.
