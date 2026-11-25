# AGENT_STATUS

> Live status of delegated agent work. **The main session updates this file whenever it starts, resumes or finishes an agent task, and commits the update together with that agent's work.** Read it first when resuming a session. Rules: CLAUDE.md → *Agent Status Tracking*.

Last updated: 2026-11-25

## Active

| ID | Workstream | Agent | Phase | Status | Started | Commit(s) | Blocked by / next step |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| — | No agent work running. | | | | | | |

## Next up (owner-approved or proposed)

| ID | Workstream | Agent | Phase | Status | Depends on |
| :--- | :--- | :--- | :--- | :--- | :--- |
| W-14 | Migration spike: `firebase/ai` + @angular/fire, App Check debug token, temperature support (D5), proxy host for mocks | Athena | 9 (spike) | Awaiting owner | Owner decisions D1–D8 and console tasks (`docs/context/MIGRATION_FIREBASE_AI_LOGIC.md` §4, §7) |
| W-15 | Architecture backfill: roundtable/status bar (CHAT-005, OPER-007) and the new sync design (SyncTarget, single-document collections, shared conflict rule) | Watson | 3–4 | Proposed | None |
| W-16 | Shards: back-fill CHAT-005 and OPER-007; follow-up bug shards (below) | Poe | 7 | Proposed | W-15 |

## Open follow-ups (not yet assigned)

| Item | Source | Suggested owner |
| :--- | :--- | :--- |
| A6 rules 4, 5, 7: 44px touch targets, aria-labels, reduced motion on history actions | Eunice, Wireframe_Chat v1.1 | Athena |
| New-chat dialog START CHAT below the viewport on desktop landscape (1280×720) | Quinn, earlier SYNC run | Eunice → Athena |
| No daily-quota meter in the status bar (T509 asserts RPM instead) | Quinn, stabilisation | Jason/Eunice (may be superseded by the migration) |
| No tombstones: a default or custom agent, or a chat, deleted on one device comes back via merge or whole-set uploads. Ties go to the cloud (by design). | Athena risks A4; Quinn W-13 | Jason (product decision) |
| N1 (Medium): `AgentProfileService.syncToCloud` blind-uploads the whole agent set on any create, update or reset, bypassing the merge rule; reset leaves custom agents in the cloud | Quinn W-13 | Poe → Athena (SYNC hardening shard); Watson if the sync design changes |
| (c) (Medium): Use Local Data can overlay the pre-sign-in local profile on the cloud settings if clicked before the cloud profile loads (Flow E11) | Quinn W-13 | Poe → Athena (same shard) |
| N2 (Low): `FirestoreService.saveBatch` writes without `sanitizeForFirestore`; no callers, so delete or sanitize it | Quinn W-13 | Poe → Athena (same shard) |
| (b) (Low): `firstLogin` is set after the auth listener fires; the restore deferral relies on microtask ordering | Quinn W-13 | Poe → Athena (same shard) |
| Offline cold start no longer E2E-tested (needs a production-build target) | Quinn, T414 | Owner decision |
| AUTH T010–T014, STABILISATION A2/A3/T5 | Deferred | Firebase AI Logic migration |

## Completed

| ID | Workstream | Agent | Result | Commit(s) |
| :--- | :--- | :--- | :--- | :--- |
| W-13 | Re-gate SYNC-002 | Quinn | **Gate PASS**: SYNC-002 Completed. E2E sync 25/25, unit 271/271, 0 nulls in emulator Firestore. Flow_RestoreAcrossDevices v1.2 | (this commit) |
| W-12 | Full-suite verification of merged stabilisation code | main session | **Stable baseline:** build pass; unit 271/271; e2e tsc clean; E2E 155 expected / 3 unexpected (only AUTH T011, T012, T014, deferred to the migration) | a6e814a |
| W-11 | Stabilisation TEST fixes T1–T4, T6–T14, SYNC T400/T404 | Quinn | 151/158 in worktree; merged | a6e814a |
| W-10 | A5 test updates (no sync dialog on fresh devices; T405–T408, T413) | main session | SYNC 25/25 ×2 | db6131e |
| W-09 | Stabilisation APP fixes A4, A1, A5, A6, A7 | Athena | Unit 270/1; T428 passes | 66c609a |
| W-08 | Stabilisation design: final test ids, A6 touch spec, restore flow refresh | Eunice | Design guide v1.6 | 58de244 |
| W-07 | Firebase AI Logic migration plan v0.1 | main session + docs research | Awaiting decisions D1–D8 | 870b35b |
| W-06 | SYNC-002 gate, two-layout Playwright projects, stabilisation triage | Quinn | Gate FAIL (A4); 54 → 35 unexpected | 3e44871 |
| W-05 | SYNC-002 defect fixes (critical cloud-profile loss and 4 others) | Athena | T405–T413 pass for real | 79c7294, 3f4201a |
| W-04 | T427 guard and 5 legacy SYNC test fixes | Quinn (worktree) | SYNC 24/24 ×2 | 1832a1f |
| W-03 | SYNC-002 E2E suite T405–T413 | Quinn | Exposed 9 defects; gate FAIL | 901973d |
| W-02 | As-built wireframes and flows for all shipped screens | Eunice | Design guide v1.5 | 5d19012 |
| W-01 | Graph semantic extraction (6 chunks) | graphify extractors | 1,734 nodes / 116 communities | n/a (graphify-out is gitignored) |
