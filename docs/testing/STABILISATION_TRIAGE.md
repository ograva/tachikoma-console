# E2E Stabilisation Triage (2026-11-24)

| Field | Value |
| :--- | :--- |
| **Author** | Quinn (QA), Phase 10 stabilisation |
| **Scope** | Every E2E failure under the two-layout Playwright config, plus 2 e2e type errors and 1 failing unit test |
| **Config** | `playwright.config.ts`: `portrait` (390x844, Pixel 5 chromium, mobile and touch; runs all tests not tagged `@landscape`) and `landscape` (1280x800 Desktop Chrome; runs only `@landscape`) |
| **Environment** | Firebase emulators (auth, firestore, storage), `ng serve --configuration local`, 1 worker |
| **Rule** | Triage only. Nothing was fixed apart from the layout config, the `@landscape` tags, removing the T406 viewport override, and keeping SYNC green (T400/T404 fail-fast with an updated `test.fail` reason; new T428 regression guard) |

## Before / after counts

"Before" is the old single-project config (Desktop Chrome 1280x720). "After" is the two-layout config: a full run (157 tests in `portrait`), then a `landscape` run after 7 OPER status-bar tests were tagged `@landscape`. Those 7 failed in both runs for the same reason, so the totals did not change.

| Module | Before: expected / unexpected | After: expected / unexpected | Fixed by layout |
| :--- | :--- | :--- | ---: |
| AUTH | 7 / 10 | 7 / 10 | 0 |
| AGNT | 28 / 3 | 29 / 2 | 1 |
| CHAT | 7 / 15 | 12 / 10 | 5 |
| ORCH | 14 / 11 | 23 / 2 | 9 |
| SYNC | 24 / 0 | 25 / 0 (T428 added as `test.fail`) | 0 |
| OPER | 22 / 15 | 26 / 11 (7 of them in `landscape`) | 4 |
| **Total** | **102 / 54** (156 tests) | **122 / 35** (157 tests) | **19** |

Other checks:
- Unit tests: 249 passed, 1 failed (`AgentProfileModel normalize should preserve an explicitly set model`).
- `npx tsc --noEmit -p e2e/tsconfig.json`: 2 errors (`e2e/specs/agnt/agnt.spec.ts:57`).

Every test that was unexpected under the new config was also unexpected under the old one, so the layout change caused no regressions.

## Hypotheses

| # | Hypothesis | Verdict |
| :--- | :--- | :--- |
| 1 | A landscape default hid portrait-only elements | **Confirmed.** Portrait fixed 19 tests: CHAT T218, T219, T221–T223; ORCH T302, T303, T321–T327; OPER T502, T503, T531, T539; AGNT T126. |
| 2 | New-chat dialog: START CHAT below the viewport, and the dialog auto-opens | **Partly.** The auto-open is real and by design (T200 asserts it). It blocks CHAT T201–T205, which never close it. At 390x844, START CHAT sits at y≈826–866: partly off-screen, but Playwright scrolls to it and the click works when a key is seeded. The below-the-viewport defect was seen at 1280x720 and doesn't block portrait. |
| 3 | The chat API-key field disappears after one keystroke | **Confirmed (APP).** It affects AUTH T011, T012 and T014. Those tests also target the INIT button with a stale `/initialize/` text selector. |
| 4 | `app-sync-dialog, .sync-dialog` matches 2 elements | **Confirmed (TEST)** for AUTH T020–T024. It also hides a real APP issue in T024: the dialog appears even with no user data (Flow E1). |
| 5 | Gemini mocking gaps in ORCH and OPER | **Rejected as a root cause.** `mockGeminiApi` works: ORCH T301–T305 and T307–T327 pass. The ORCH and OPER failures come from the guest API-key dialog, stale selectors and premature assertions. A latent gap remains: mocks are installed after page load, so the `models` list and detail fetches made on load fall through to `route.continue()` and the real network. |

## Root-cause summary

Severity applies to APP findings; TEST findings are rated by how many tests they block.

| ID | Root cause | Class | Severity | Affected test IDs | Evidence | Owner | Proposed fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| A1 | Guest users get the "Save API Key to Profile?" dialog, stacked twice. `checkAndSyncApiKey()` gates on `isAuthenticated()` (true for anonymous guests) instead of `isRealUser()`. The effect also tracks the signals read inside `checkAndSyncApiKey()`, so it re-fires and opens a second dialog. | APP | High | **Primary:** CHAT T207, ORCH T306, OPER T510. **Will block after the TEST fixes:** CHAT T201–T205, OPER T504, ORCH T300. | `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts:396-401` (effect), `:435-437` (guard), `:467` (open). Two `dialog "Save API Key to Profile?"` in 18 failure snapshots; its `cdk-overlay-dark-backdrop` intercepts `chat-send-btn` (T306, T510) and `chat-history-item` (T207). | Athena | Gate on `isRealUser()` and read signals with `untracked()` (or open the dialog once per session). |
| A2 | The header API-key block unmounts after the first keystroke. `isInitialized` returns `apiKey.length > 0`, and the input is `[(ngModel)]="apiKey"`. | APP | High | AUTH T011, T012, T014 | `tachikoma-chat.component.ts:348-350`, `tachikoma-chat.component.html:149-150`. Documented as-built in `Wireframe_Chat.md` lines 152 and 179. | Athena | Bind the input to a draft field; set `apiKey` only in `saveKey()`. |
| A3 | In portrait with no key, the header API-key block (`flex-shrink: 0`, 10rem input, never hidden on phones) overlaps the new-chat, history and export buttons. | APP | High | SYNC T400, T404 (`test.fail`) | `tachikoma-chat.component.scss:1720-1731`, `.html:148`. Trace: `chat-api-key-input … intercepts pointer events` on the add button (screenshot at 390x844). | Eunice → Athena | Wrap or move the key block below the header under 768px (design decision first). |
| A4 | The merge sync strategy overwrites cloud edits to built-in agents on a new device. Boot-time defaults look newer than the cloud edit, so they are uploaded and kept locally. | APP | High | SYNC T428 (`test.fail`) | `src/app/services/firestore.service.ts:95-108` (`planCollectionSync` merge). The untouched-default rule exists only in `AgentProfileService.loadFromCloud()` (`agent-profile.service.ts:184-189`). Probe: merge left `LOGIKOMA` in cloud and locally; skip kept the edit. | Athena | Apply `isUntouchedDefault` (local yields to cloud) inside the merge plan for `agent_profiles`. |
| A5 | The sync dialog appears even when the only "local data" is the boot-time default agents (Flow E1). | APP | Medium | AUTH T024 (hidden by T3) | `src/app/services/auth.service.ts:230` `checkForLocalData()` (`tachikoma_agent_profiles` always exists after boot). T024's snapshot shows `dialog "Sync Your Data"`. | Athena (Eunice for the copy) | Ignore untouched defaults when deciding `firstLogin`. |
| A6 | Chat-history edit and delete actions show only on `:hover` (`opacity: 0`), so they are unreachable on touch devices. | APP | Medium | CHAT T208–T210 (latent; T9 fails first) | `tachikoma-chat.component.scss:1048-1057` | Eunice → Athena | Show actions on touch and focus (`@media (hover: none)`, `:focus-within`). |
| A7 | DAT-302: `user_profile.photoURL` is written to Firestore as `null`. | APP | Medium | none (found in /audit) | `src/app/models/user-profile.model.ts:48` (`DEFAULTS.photoURL: null`); `firestore.service.ts:274-276` keeps `null`. Emulator scan: 10 of 12 `user_profile` docs carry `photoURL: null`. | Athena | Default to `''` and drop `null` in `sanitizeForFirestore`. |
| T1 | The CHAT suite never closes the auto-opened new-chat selector (`.agent-selector-overlay` intercepts the add button). | TEST | blocks 5 | CHAT T201, T202, T203, T204, T205 | Trace: `<h2>SELECT PARTICIPATING AGENTS</h2> … intercepts pointer events` | Quinn | Move `closeAutoOpenedNewChatSelector` from `sync.spec.ts` to `e2e/helpers/` and call it in the CHAT `beforeEach`. |
| T2 | `suppressExplainerDialog` is called after `page.goto`, so the explainer can still open. | TEST | blocks 3 | AUTH T012, T014; CHAT T204 | `dialog "Welcome to Multi-Agent Chat"` in the snapshots | Quinn | Suppress before `goto` (or set it in `addInitScript`). |
| T3 | Sync-dialog selector `app-sync-dialog, .sync-dialog` matches the host and the inner div (strict-mode violation). | TEST | blocks 5 | AUTH T020, T021, T022, T023, T024 | `strict mode violation … resolved to 2 elements` | Quinn | Use `[data-test-id="sync-dialog"]`, `sync-option-*` and `sync-skip-btn` (or `resolveSyncDialog`). |
| T4 | Sign-in tests never resolve the sync dialog, which always appears (A5). The modal blocks the header profile menu, and the logout path uses guessed fallback selectors. | TEST | blocks 2 | AUTH T005, T006 | `dialog "Sync Your Data"` in the snapshots; `button[aria-label="Profile"]` click waits for 30 s | Quinn (+ Eunice: Design Gap) | Call `resolveSyncDialog(page, 'skip')` after sign-in; add `data-test-id`s for the profile menu and logout. |
| T5 | The INIT button is matched by `hasText: /initialize/` but its text is "INIT". | TEST | blocks 3 (behind A2) | AUTH T011, T012, T014 | Trace: `waiting for locator('button').filter({ hasText: /initialize/i })` | Quinn | Use `[data-test-id="chat-init-btn"]` and `chat-api-key-input`. |
| T6 | The OPER metrics tests target the removed header dashboard (`.metrics-dashboard`, `.model-group`, `.meter-bar`, `.meter-info`). Metrics now live in the status bar. | TEST | blocks 7 | OPER T500, T501, T504, T506, T509, T510, T511 (now `@landscape`) | `grep` finds none of these classes in `src/app/**/*.html`; `element(s) not found` | Quinn | Re-point to `chat-status-tpm`, `-rpm`, `-ctx`, `-model` (`Wireframe_ChatRoundtable.md` §Status Bar) and update the expectations. |
| T7 | T507 and T508 assert the soft-limit banner without creating the near-limit condition (the `page.evaluate` is a no-op). | TEST | blocks 2 | OPER T507, T508 | Test body, `oper.spec.ts:124-140` | Quinn | Seed a near-limit context (or mock `usageMetadata` totals), then assert. |
| T8 | T514 and T515 assert on the captured prompt before the request is sent. `chat-agent-message.first()` is already visible from the seeded transcript. | TEST | blocks 2 | OPER T514, T515 | `Received string: ""`; `oper.spec.ts:215-219` | Quinn | `await page.waitForRequest(/:generateContent/)` (or wait for the agent-message count to grow) before asserting. |
| T9 | The edit and delete history buttons are clicked by CSS class with `force` without opening the history drawer. They also have no `data-test-id`. | TEST | blocks 3 | CHAT T208, T209, T210 | `locator.click: Element is not visible` on `.edit-chat-btn` / `.delete-chat-btn` | Quinn (+ Eunice: Design Gap) | Open `chat-history-toggle-btn` first; add ids such as `chat-history-item-edit-btn` and `chat-history-item-delete-btn`. |
| T10 | T220 force-clicks `chat-jump-latest-btn` while the nav is still non-interactive (shown only after the scroll event's CD tick), then reads `scrollTop` immediately. | TEST | blocks 1 | CHAT T220 | Screenshot: no nav buttons visible; feed still at the top. `jumpToLatest()` (`tachikoma-chat.component.ts:247-251`) is correct. | Quinn | Wait for the button to be visible, click without `force`, and `expect.poll` the scroll position. |
| T11 | T300 asserts the NEURAL ACTIVITY panel (`.status-panel`). The panel is `display: none` under 768px and absent in landscape, so neither project can show it. | TEST | blocks 1 | ORCH T300 | `.status-panel` resolved 6 times, never visible; `tachikoma-chat.component.scss:1375-1383` | Quinn (+ Eunice: the panel has no `data-test-id`) | Assert `chat-status-processing` (status bar) and tag `@landscape`, or assert `chat-agent-message`. |
| T12 | AGNT form selectors aren't `data-test-id`s. `textarea[placeholder*="personality"], textarea` matches the hidden XML-editor textarea first (T101). `mat-form-field:has-text("Role")` matches 2 fields (T114). | TEST | blocks 2 | AGNT T101, T114 | T101: `locator.fill` times out on the textarea. T114: `strict mode violation … 2 elements`. | Quinn (+ Eunice: Design Gap) | Add `data-test-id`s to the create-form fields (name, role, mode toggle, system prompt) and use them. |
| T13 | Type errors: `nameInput.triple_click` / `nameInput.selectAll` aren't `Locator` APIs. At runtime it's a no-op (`fill` replaces the text), so T103 passes. | TEST | Low | AGNT T103 (typecheck only) | `agnt.spec.ts(57,23)` and `(57,91)` TS2339 | Quinn | Delete line 57 (`fill` already replaces the value). |
| T14 | Unit fixture uses a retired model. `AgentProfileModel.normalize` intentionally maps models outside `validModels` to the default, and `models/gemini-1.5-pro` was retired. | TEST | Low | unit: `AgentProfileModel normalize should preserve an explicitly set model` | `agent-profile.model.spec.ts:34-35` vs `agent-profile.model.ts:62-73` | Quinn | Use a current model such as `models/gemini-pro-latest`. |

## Per-test list (after the layout change)

| Test | Project | Result | Root cause(s), primary first |
| :--- | :--- | :--- | :--- |
| AUTH T005 logout clears local session data | portrait | timedOut | T4 (A5 underlying) |
| AUTH T006 logout redirects to authentication page | portrait | timedOut | T4 (A5 underlying) |
| AUTH T011 valid API key saves and shows initialized state | portrait | timedOut | A2, T5 |
| AUTH T012 empty API key shows validation feedback | portrait | timedOut | A2, T5, T2 |
| AUTH T014 malformed API key is sanitized before save | portrait | timedOut | A2, T5, T2 |
| AUTH T020 sync dialog appears on first login with local data | portrait | failed | T3 |
| AUTH T021 sync dialog presents three options | portrait | failed | T3 |
| AUTH T022 merge closes dialog and continues | portrait | failed | T3 |
| AUTH T023 skip closes dialog | portrait | failed | T3 |
| AUTH T024 no sync dialog without local data | portrait | failed | T3, then A5 (the dialog really appears) |
| AGNT T101 create agent with required fields | portrait | timedOut | T12 |
| AGNT T114 form mode shows structured fields | portrait | failed | T12 |
| CHAT T201 roster shows all agents | portrait | timedOut | T1, then A1 |
| CHAT T202 creating chat requires an agent | portrait | timedOut | T1, then A1 |
| CHAT T203 title input in new chat dialog | portrait | timedOut | T1, then A1 |
| CHAT T204 description input in new chat dialog | portrait | timedOut | T1, T2, then A1 |
| CHAT T205 description persists after creation | portrait | timedOut | T1, then A1 |
| CHAT T207 switching chats loads the correct session | portrait | timedOut | A1 |
| CHAT T208 edit chat metadata | portrait | failed | T9 (A6 latent) |
| CHAT T209 deleting a chat | portrait | failed | T9 (A6 latent) |
| CHAT T210 deleted chat falls back | portrait | failed | T9 (A6 latent) |
| CHAT T220 jump-to-latest scrolls to bottom | portrait | failed | T10 |
| ORCH T300 processing indicators | portrait | failed | T11 (A1 present) |
| ORCH T306 multiple rounds increment counter | portrait | timedOut | A1 |
| OPER T500 metrics dashboard visible @smoke | landscape | failed | T6 |
| OPER T501 per-model metrics section | landscape | failed | T6 |
| OPER T504 daily request counter increments | landscape | timedOut | T6, then A1 |
| OPER T506 formatTokenCount M suffix | landscape | timedOut | T6 |
| OPER T507 soft limit banner appears | portrait | failed | T7 |
| OPER T508 soft limit banner ARIA live | portrait | failed | T7 |
| OPER T509 daily quota meter | landscape | failed | T6 |
| OPER T510 meter warning class near limit | landscape | timedOut | A1, T6 |
| OPER T511 RPM shown in metrics | landscape | failed | T6 |
| OPER T514 round-based windowing | portrait | failed | T8 |
| OPER T515 older rounds compressed | portrait | failed | T8 |
| SYNC T400, T404 (expected failures) | portrait | expected (`test.fail`) | A3 |
| SYNC T428 (expected failure) | portrait | expected (`test.fail`) | A4 |
| unit `AgentProfileModel normalize … explicitly set model` | Karma | failed | T14 |
| e2e typecheck `agnt.spec.ts:57` | tsc | 2 errors | T13 |

Fixed by the layout change (were unexpected, now expected): AGNT T126; CHAT T218, T219, T221, T222, T223; ORCH T302, T303, T321, T322, T323, T324, T325, T326, T327; OPER T502, T503, T531, T539.

## Design Gaps for Eunice

- Header profile-menu trigger and Logout button: no `data-test-id` (AUTH T005, T006).
- Chat-history item edit and delete buttons: no `data-test-id`; hover-only on touch (A6).
- Agent create-form fields (name, role select, form/XML mode toggle, system prompt): no `data-test-id` (AGNT T101, T114).
- NEURAL ACTIVITY panel: `Wireframe_Chat.md` lists `chat-neural-activity-panel`, but the template has no id.
- Portrait header layout with the API-key block at 390px (A3).
- `Flow_RestoreAcrossDevices.md` still describes the pre-fix behaviour (mechanism C writes `firestore_{uid}_*`; E2 and E3; happy-path step 5). It needs an as-built refresh after SYNC-002.
