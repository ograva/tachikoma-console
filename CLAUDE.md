# CLAUDE.md - Tachikoma Console

Purpose: Guide Claude Code to operate within the Tachikoma Console (SAC) Agentic Workflow.

## Project Identity
- **Name:** Tachikoma Console (SAC)
- **Identity:** Futuristic, Stand Alone Complex inspired AI orchestration console.
- **Stack:** Angular 20, Firebase (Auth/Firestore/Storage), SCSS, Playwright.

## Agentic Workflow
The project is run by a cohort of seven specialist agents. Each has a Claude Code subagent in `.claude/agents/<name>.md`, which is the operating contract Claude uses. The fuller spec in `.github/agents/<name>.agent.md` (GitHub Copilot) holds the detailed output templates.

| Agent | Role | Owns |
| :--- | :--- | :--- |
| **Mary** | Analyst | `docs/context/ProjectBrief.md` |
| **Jason** | PM | `docs/context/PRD.md`, `docs/stories/<PREFIX>/` |
| **Watson** | Architect | `docs/context/Architecture.md`, `DECISION_LOG.md`, `CONSTRAINTS.md`, `.github/copilot-instructions.md` |
| **Eunice** | UI/UX Designer | `docs/context/UI_UX_Design_Guide.md`, `docs/context/designs/` |
| **Poe** | Product Owner | `docs/shards/<PREFIX>/`, `docs/context/BACKLOG.md` |
| **Quinn** | QA | `e2e/`, unit specs, `/audit` and `/gate` verdicts |
| **Athena** | Lead Dev / DevOps | `src/`, branches, PRs, GitHub Issues and the Project board |

## Cohort Workflow
This is the owner's working sequence (source: `.github/agents/cohorts-flow.md`). Every change belongs to one phase. Before acting, name the phase in one line, for example "Phase 7, Poe: sharding the new EXPT module".

| # | Phase | Agent | Mode | Consumes | Produces | Exit gate |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Discovery | Mary | Converse | Owner's idea | `ProjectBrief.md` | All 9 brief sections substantive; owner agrees |
| 2 | Requirements | Jason | Converse | Brief | `PRD.md` with module PREFIX codes | 9 PRD sections; ≥ 4 ACs per story |
| 3 | Architecture | Watson | Delegate | PRD, `CONSTRAINTS.md` | `Architecture.md`, ADL entry | Every PRD module mapped to components, services and data models |
| 4 | PRD ⇄ Architecture sync | Jason ⇄ Watson | Converse | PRD, Architecture | Aligned versions of both, ADL entries | Poe `/align` finds no gaps; owner confirms |
| 5 | Stories | Jason | Delegate | Aligned PRD and Architecture | `docs/stories/<PREFIX>/<PREFIX-###>-*.md` | Each story traces to a PRD module and an Architecture component |
| 6 | Design system and wireframes | Eunice | Converse, then Delegate | Brief, PRD, stories, Architecture | Design guide, `Wireframe_*.md`, `Flow_*.md`, UI task board | Every story is covered by a wireframe with a `data-test-id` map |
| 7 | Sharding | Poe | Delegate | Architecture, stories, wireframes | Shard files and `BACKLOG.md` rows | Shards sorted by dependency; every UI shard cites its wireframe |
| 8 | Initial test suite | Quinn | Delegate | Shards, stories, flows | `e2e/specs/<prefix>/` scenarios and a unit test plan | Every shard AC and flow path has a named test |
| 9 | Development | Athena | Delegate | Shard and the test suite | Code, passing tests, updated `BACKLOG.md`, PR | Shard ACs met; build and suite green; status set to Ready for Review |
| 10 | Test refinement and gate | Quinn | Delegate | Implemented code | Refined tests, `/audit` findings, `/gate` verdict | No open Critical/High findings; shard set to Completed |

**Loop-back rules:**
- **New feature:** re-enter at Phase 2 (Jason) and flow forward.
- **Change of direction:** re-enter at Phase 1 (Mary). A brief at v2.0 or later triggers a Watson ADL entry.
- **Implementation deviates from `Architecture.md`:** Athena stops and hands off with "Technical Pivot Required" to Watson. Watson runs `/log-decision`, then Phase 9 resumes.
- **Missing wireframe or `data-test-id` (a Design Gap):** go back to Eunice before implementing or testing that element.
- **Feature shipped outside the pipeline:** run `/backfill <feature>`. It writes the missing layers as built (Jason → Watson and Eunice → Poe → Quinn) after one plan approval.
- **Scope change mid-sprint:** Poe marks the affected shards `Superseded` and creates replacement shards. Files are never deleted.

**Operating rules:**
- **Converse vs Delegate.** Subagents can't ask questions mid-task. Run interactive phases in the main session with the slash commands `/mary` (Phase 1), `/jason` (Phase 2), `/align` (Phase 4, Jason ⇄ Watson) and `/eunice` (Phase 6). Each loads that persona from `.claude/agents/<name>.md`. `/cohort` reports each module's phase and the next handoff. `/backfill <feature>` retrofits a shipped feature into the cohort. Run self-contained deliverables (tech spec, stories, shards, test plans, shard implementation) by spawning the subagent of that name.
- **The owner approves every phase transition.** Finish a phase, report its artifact and the exit-gate status, and propose the next handoff. Don't chain into the next phase unprompted.
- **Missing upstream artifacts block work.** If a phase's inputs don't exist (for example, sharding UI work with no wireframe), say which artifact is missing and ask whether to produce it or proceed without it.
- **Precedence when documents conflict:** `CONSTRAINTS.md` > `DECISION_LOG.md` > `Architecture.md` > `PRD.md` > shard > story. Record conflicts; never silently resolve them.
- **PREFIX codes are canonical.** Module prefixes from the PRD (`AUTH`, `AGNT`, `CHAT`, `ORCH`, `SYNC`, `OPER`) key every story, shard, wireframe, test and GitHub label.
- **Shard status lifecycle:** `Not Started` → `In Progress` → `Ready for Review` → `Completed` → `Superseded`. `BACKLOG.md` currently writes `Done`, which the Athena scripts accept as an alias of `Completed`.

## Agent Status Tracking
`docs/context/AGENT_STATUS.md` is the live record of delegated agent work. Read it first when resuming a session.
- **Before spawning or resuming an agent:** add or update its row in *Active* (ID `W-##`, workstream, agent, phase, status `In Progress`, start date).
- **When an agent reports back:** move the row to *Completed* with its result and commit hash(es), or mark it `Blocked` with the reason. Commit the status change together with that agent's work.
- **Agents that stop early** (usage limit, crash): mark the row `Paused` with the reason and note where the uncommitted work is (worktree path or backup patch).
- **Follow-ups an agent raises but nobody owns yet** go in *Open follow-ups*. Don't leave them only in chat.
- **Before ending a session:** make sure no row is stale, and list anything still `In Progress` or `Paused` in the final summary.

## Repo Reality
The agent specs exist in three places, with one source of truth:
- `.github/agents/<name>.agent.md`: the **full spec** and the single source of truth (also used by GitHub Copilot).
- `.claude/agents/<name>.md`: the Claude Code subagent. It holds the Claude-specific operating contract (tools, converse/delegate behaviour, report format) and points to the full spec.
- `.cursor/rules/agent-<name>.md`: a thin Cursor rule that includes the full spec via `@.github/agents/<name>.agent.md` and adds a few non-negotiables.

Change behaviour in the full spec first. After editing any agent file, run `npm run agents:check`: it fails if an agent is missing from any location, if a pointer is broken, or if a retired convention reappears. Current gaps:

| Topic | Current state |
| :--- | :--- |
| App structure | A single Angular 20 app at `src/app/{pages,components,layouts,services,models}`. There is no `projects/`/`libs/`/`functions/` monorepo. |
| E2E layout | `e2e/specs/<prefix>/<prefix>[-NNN-desc].spec.ts`, helpers in `e2e/helpers/`, test IDs (`T000`…) in the spec titles. |
| Test registry | `docs/testing/TEST_REGISTRY.md` is **generated** from the spec titles by `npm run test:registry` (`:check` fails on stale or duplicate IDs). The other `docs/testing/*` guides named in older specs don't exist. |
| CI | There are no `.github/workflows/`, so Quinn's `/ci-sync` proposes a new `test.yml` for owner review. |
| Styling | Angular Material 20 with app-owned SCSS tokens (`src/assets/scss/_sac-tokens.scss`). Tailwind is not approved (`CONSTRAINTS.md` §7). |
| Copilot frontmatter | `model:` and `handoffs:` in `.github/agents` are ignored by Claude. Claude proposes handoffs in its report back to the owner. |

## Monorepo Reality
- **App:** Angular standalone components.
- **State:** Angular Signals.
- **Styling:** SCSS with Angular Material 20 and app-owned themes (no Tailwind; see `CONSTRAINTS.md` §7).
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
- `npm run test:registry` - Regenerate `docs/testing/TEST_REGISTRY.md` from the spec titles (`:check` to verify)
- `npm run agents:check` - Verify the Claude, Copilot and Cursor agent specs are in sync

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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
