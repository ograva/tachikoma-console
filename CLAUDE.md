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
This is the owner's working sequence (source: `.github/agents/cohorts -flow.md`). Every change belongs to one phase. Before acting, name the phase in one line, for example "Phase 7, Poe: sharding the new EXPT module".

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
- **Scope change mid-sprint:** Poe marks the affected shards `Superseded` and creates replacement shards. Files are never deleted.

**Operating rules:**
- **Converse vs Delegate.** Subagents can't ask questions mid-task. Run interactive phases (Mary's `/brainstorm`, the Jason ⇄ Watson iteration, Eunice's moodboard review) in the main session: read `.claude/agents/<name>.md` and adopt that persona. Run self-contained deliverables (tech spec, stories, shards, test plans, shard implementation) by spawning the subagent of that name.
- **The owner approves every phase transition.** Finish a phase, report its artifact and the exit-gate status, and propose the next handoff. Don't chain into the next phase unprompted.
- **Missing upstream artifacts block work.** If a phase's inputs don't exist (for example, sharding UI work with no wireframe), say which artifact is missing and ask whether to produce it or proceed without it.
- **Precedence when documents conflict:** `CONSTRAINTS.md` > `DECISION_LOG.md` > `Architecture.md` > `PRD.md` > shard > story. Record conflicts; never silently resolve them.
- **PREFIX codes are canonical.** Module prefixes from the PRD (`AUTH`, `AGNT`, `CHAT`, `ORCH`, `SYNC`, `OPER`) key every story, shard, wireframe, test and GitHub label.
- **Shard status lifecycle:** `Not Started` → `In Progress` → `Ready for Review` → `Completed` → `Superseded`. `BACKLOG.md` currently writes `Done`, which the Athena scripts accept as an alias of `Completed`.

## Repo Reality (corrections to the agent specs)
The `.github/agents/*.agent.md` specs were written against a generic monorepo template. Where they disagree with this repo, the right-hand column wins.

| The agent spec says | In this repo |
| :--- | :--- |
| `projects/`, `libs/`, `functions/` monorepo; `docs/MONOREPO USE GUIDE.md` | One Angular app: `src/app/{pages,components,layouts,services,models}`. Use `README.md` and `Architecture.md` instead. |
| `docs/testing/{TEST_REGISTRY,TESTING_STRATEGY,WRITING_TESTS,DATA_TEST_IDS}.md` | Not created yet. Test IDs live in spec titles (`T000`…). Selector conventions are in `OPER-005` and `CONSTRAINTS.md`. |
| `e2e/{admin,user-app}/flows/<area>/T###-*.spec.ts`, `e2e/global-setup.ts` | `e2e/specs/<prefix>/<prefix>[-NNN-desc].spec.ts`; shared helpers in `e2e/helpers/` |
| `npm run test:e2e:[app]` | `npm run test:e2e`, `test:e2e:smoke`, `test:e2e:local-fast`, `test:e2e:local-hosting-{smoke,regression}` |
| `.github/workflows/test.yml`, `deploy.yml`; `/ci-sync` | No CI workflows exist yet. `/ci-sync` would create them, not patch them. |
| `.github/prompts/sync-copilot-instructions.prompt.md` | Missing. Watson regenerates `.github/copilot-instructions.md` directly. |
| `docs/base_template/` | Absent, so that rule is moot. |
| Gemini/Copilot `model:` and `handoffs:` frontmatter | Ignored by Claude. Handoffs are proposed in the report back to the owner. |
| "Material 21 + Tailwind 4 hybrid" (Eunice, Quinn, older CLAUDE.md) | `CONSTRAINTS.md` §7 says Angular Material plus app-owned SCSS themes. Tailwind is "Not Recommended Unless Explicitly Approved" and isn't installed. `package.json` pins `@angular/material@^20`. Write design tokens as SCSS variables or CSS custom properties, not Tailwind config. |

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
