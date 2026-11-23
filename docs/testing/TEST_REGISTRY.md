# TEST_REGISTRY

> **Generated file. Do not edit by hand.** Regenerate with `npm run test:registry` after adding or renaming tests.
> Source of truth: the `T###` titles in `e2e/specs/**/*.spec.ts`. Owner: Quinn (QA).

## Conventions

- Group tests in a `test.describe('T###-T### <Area>', …)` block. The range reserves those IDs for that area.
- Title each test `test('T### should …', …)`. Add `@smoke` to tests that guard a critical path (`npm run test:e2e:smoke`).
- Select elements only with `[data-test-id="…"]`. Reuse the helpers in `e2e/helpers/`.
- Allocate new IDs from the module's block: use **Next free** below for a new area, or an unused ID inside an existing reserved range.
- Note `Source: Quinn` in a comment above tests that Quinn authored beyond Eunice's flow diagrams.

## Summary

| Module | Range | Spec folder | Tests | Smoke | Next free | Reserved but unused |
| :--- | :--- | :--- | ---: | ---: | :--- | :--- |
| AUTH | T000–T099 | `e2e/specs/auth/` | 17 | 1 | T027 | T007–T009, T025–T026 |
| AGNT | T100–T199 | `e2e/specs/agnt/` | 31 | 0 | T131 | — |
| CHAT | T200–T299 | `e2e/specs/chat/` | 22 | 1 | T224 | T211–T212 |
| ORCH | T300–T399 | `e2e/specs/orch/` | 25 | 0 | T328 | T312–T314 |
| SYNC | T400–T499 | `e2e/specs/sync/` | 14 | 0 | T427 | T405–T406, T419–T420, T425–T426 |
| OPER | T500–T599 | `e2e/specs/oper/` | 37 | 11 | T543 | T512–T513, T517–T520 |
| EDGE | T900–T999 | any module folder | 0 | 0 | T900 | — |

**Total:** 146 tests, 13 tagged `@smoke`.

## AUTH

### T000–T004 Sign-in flows

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T000 | anonymous/guest path lands user in the app | ✓ | `e2e/specs/auth/auth.spec.ts:26` |
| T001 | email/password sign-in succeeds with valid credentials |  | `e2e/specs/auth/auth.spec.ts:32` |
| T002 | failed sign-in shows error message |  | `e2e/specs/auth/auth.spec.ts:39` |
| T003 | session persists across page reload |  | `e2e/specs/auth/auth.spec.ts:47` |
| T004 | anonymous user local data is preserved after refresh |  | `e2e/specs/auth/auth.spec.ts:58` |

### T005–T009 Logout behavior

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T005 | logout clears local session data |  | `e2e/specs/auth/auth.spec.ts:74` |
| T006 | logout redirects to authentication page |  | `e2e/specs/auth/auth.spec.ts:99` |

### T010–T014 API credentials

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T010 | API key input is present in chat header when unauthenticated |  | `e2e/specs/auth/auth.spec.ts:113` |
| T011 | entering a valid API key saves and shows the initialized state |  | `e2e/specs/auth/auth.spec.ts:122` |
| T012 | empty API key shows validation feedback |  | `e2e/specs/auth/auth.spec.ts:135` |
| T013 | API key persists across reload for guest users |  | `e2e/specs/auth/auth.spec.ts:148` |
| T014 | malformed API key (with non-ASCII chars) is sanitized before save |  | `e2e/specs/auth/auth.spec.ts:159` |

### T020–T026 First-login sync strategy

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T020 | sync dialog appears on first authenticated login when local data exists |  | `e2e/specs/auth/auth.spec.ts:180` |
| T021 | sync dialog presents three strategy options |  | `e2e/specs/auth/auth.spec.ts:203` |
| T022 | selecting merge strategy closes dialog and continues |  | `e2e/specs/auth/auth.spec.ts:221` |
| T023 | skip-for-now closes sync dialog without performing sync |  | `e2e/specs/auth/auth.spec.ts:241` |
| T024 | sync dialog does not appear when no local data exists |  | `e2e/specs/auth/auth.spec.ts:258` |

## AGNT

### T100–T106 Create and Edit Profiles

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T100 | new agent button reveals the create form |  | `e2e/specs/agnt/agnt.spec.ts:20` |
| T101 | create a new agent profile with required fields |  | `e2e/specs/agnt/agnt.spec.ts:25` |
| T102 | profile persists to localStorage immediately after save |  | `e2e/specs/agnt/agnt.spec.ts:39` |
| T103 | edit an existing profile — name change saves correctly |  | `e2e/specs/agnt/agnt.spec.ts:53` |
| T104 | cancel edit does not persist changes |  | `e2e/specs/agnt/agnt.spec.ts:64` |
| T105 | local persistence is immediate — reload shows saved profile |  | `e2e/specs/agnt/agnt.spec.ts:80` |
| T106 | saving a profile shows updated model field with default value |  | `e2e/specs/agnt/agnt.spec.ts:90` |

### T107–T112 Role, Model, and Silence

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T107 | role selector shows chatter and moderator options |  | `e2e/specs/agnt/agnt.spec.ts:110` |
| T108 | silence protocol selector shows all four options |  | `e2e/specs/agnt/agnt.spec.ts:118` |
| T109 | model selector shows approved Gemini models |  | `e2e/specs/agnt/agnt.spec.ts:128` |
| T110 | save with moderator role stores role correctly |  | `e2e/specs/agnt/agnt.spec.ts:135` |
| T111 | silence protocol defaults to standard when not explicitly selected |  | `e2e/specs/agnt/agnt.spec.ts:152` |
| T112 | conservative silence protocol saves and reloads correctly |  | `e2e/specs/agnt/agnt.spec.ts:164` |

### T113–T118 System Instruction Authoring

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T113 | mode toggle shows plaintext, form, and XML options |  | `e2e/specs/agnt/agnt.spec.ts:185` |
| T114 | switching to form mode shows structured fields |  | `e2e/specs/agnt/agnt.spec.ts:192` |
| T115 | switching to XML mode shows the XML text area |  | `e2e/specs/agnt/agnt.spec.ts:198` |
| T116 | AI convert button is visible in plain-text mode |  | `e2e/specs/agnt/agnt.spec.ts:204` |
| T117 | convert button is disabled when system prompt is empty |  | `e2e/specs/agnt/agnt.spec.ts:211` |
| T118 | save with form mode stores systemMode as "form" |  | `e2e/specs/agnt/agnt.spec.ts:217` |

### T119–T124 Draft Persona from Intent

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T119 | intent panel and input are visible on profiles page |  | `e2e/specs/agnt/agnt.spec.ts:237` |
| T120 | generate draft button is disabled when intent field is empty |  | `e2e/specs/agnt/agnt.spec.ts:242` |
| T121 | generate draft button enables when intent text is entered |  | `e2e/specs/agnt/agnt.spec.ts:246` |
| T122 | intent input accepts up to 500 characters |  | `e2e/specs/agnt/agnt.spec.ts:251` |
| T123 | discard draft button removes the preview panel |  | `e2e/specs/agnt/agnt.spec.ts:258` |
| T124 | apply draft button is not present when no draft exists |  | `e2e/specs/agnt/agnt.spec.ts:269` |

### T125–T130 Material Dialog flows

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T125 | delete profile shows Material confirmation dialog |  | `e2e/specs/agnt/agnt.spec.ts:277` |
| T126 | confirm delete removes the profile |  | `e2e/specs/agnt/agnt.spec.ts:283` |
| T127 | cancel delete keeps the profile |  | `e2e/specs/agnt/agnt.spec.ts:290` |
| T128 | reset to defaults shows Material confirmation dialog |  | `e2e/specs/agnt/agnt.spec.ts:297` |
| T129 | confirming reset restores default profiles |  | `e2e/specs/agnt/agnt.spec.ts:302` |
| T130 | Material dialog has proper focus trap — escape closes it |  | `e2e/specs/agnt/agnt.spec.ts:320` |

## CHAT

### T200–T205 New Chat Creation

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T200 | new chat dialog opens with agent roster | ✓ | `e2e/specs/chat/chat.spec.ts:26` |
| T201 | roster shows all available agents |  | `e2e/specs/chat/chat.spec.ts:31` |
| T202 | creating chat requires at least one agent selected |  | `e2e/specs/chat/chat.spec.ts:39` |
| T203 | chat title input is available in new chat dialog |  | `e2e/specs/chat/chat.spec.ts:56` |
| T204 | chat description input is available in new chat dialog |  | `e2e/specs/chat/chat.spec.ts:61` |
| T205 | chat description persists after creation |  | `e2e/specs/chat/chat.spec.ts:66` |

### T206–T212 Resume and Manage

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T206 | history drawer opens and shows saved chats |  | `e2e/specs/chat/chat.spec.ts:88` |
| T207 | switching chats loads the correct session |  | `e2e/specs/chat/chat.spec.ts:106` |
| T208 | edit chat metadata dialog saves title and description |  | `e2e/specs/chat/chat.spec.ts:123` |
| T209 | deleting a chat removes it from history |  | `e2e/specs/chat/chat.spec.ts:148` |
| T210 | switching to deleted chat falls back to next available |  | `e2e/specs/chat/chat.spec.ts:167` |

### T213–T217 Export

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T213 | export menu button is visible when messages exist |  | `e2e/specs/chat/chat.spec.ts:206` |
| T214 | export menu shows text, PDF, and Word options |  | `e2e/specs/chat/chat.spec.ts:212` |
| T215 | export as text triggers a file download |  | `e2e/specs/chat/chat.spec.ts:221` |
| T216 | export as PDF triggers a file download |  | `e2e/specs/chat/chat.spec.ts:234` |
| T217 | exported filename uses the chat title (sanitized) |  | `e2e/specs/chat/chat.spec.ts:247` |

### T218–T223 Sticky Transcript Navigation

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T218 | jump-to-top button is present in the DOM |  | `e2e/specs/chat/chat.spec.ts:286` |
| T219 | jump-to-latest button is present in the DOM |  | `e2e/specs/chat/chat.spec.ts:290` |
| T220 | clicking jump-to-latest scrolls feed to the bottom |  | `e2e/specs/chat/chat.spec.ts:294` |
| T221 | clicking jump-to-top scrolls feed to the top |  | `e2e/specs/chat/chat.spec.ts:310` |
| T222 | nav controls appear on scroll interaction |  | `e2e/specs/chat/chat.spec.ts:321` |
| T223 | unread badge shows correct count |  | `e2e/specs/chat/chat.spec.ts:330` |

## ORCH

### T300–T307 Round-Robin Execution

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T300 | submitting a message triggers agent processing indicators |  | `e2e/specs/orch/orch.spec.ts:48` |
| T301 | all chatter agents produce responses in transcript |  | `e2e/specs/orch/orch.spec.ts:62` |
| T302 | moderator response appears after chatters |  | `e2e/specs/orch/orch.spec.ts:78` |
| T303 | user message appears in transcript immediately |  | `e2e/specs/orch/orch.spec.ts:97` |
| T304 | input is cleared after send |  | `e2e/specs/orch/orch.spec.ts:107` |
| T305 | send button is disabled while processing |  | `e2e/specs/orch/orch.spec.ts:117` |
| T306 | multiple rounds increment the round counter |  | `e2e/specs/orch/orch.spec.ts:142` |
| T307 | messages are saved to localStorage after a round |  | `e2e/specs/orch/orch.spec.ts:157` |

### T308–T314 Silence and Synthesis

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T308 | SILENCE response from chatter is excluded from transcript |  | `e2e/specs/orch/orch.spec.ts:177` |
| T309 | SILENCE from moderator is excluded from transcript |  | `e2e/specs/orch/orch.spec.ts:191` |
| T310 | non-silence response from first chatter always shown |  | `e2e/specs/orch/orch.spec.ts:203` |
| T311 | moderator synthesis appears in transcript when agents have spoken |  | `e2e/specs/orch/orch.spec.ts:216` |

### T315–T320 Shared Context

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T315 | file upload button is present in chat footer |  | `e2e/specs/orch/orch.spec.ts:233` |
| T316 | uploading a text file shows it in the file context bar |  | `e2e/specs/orch/orch.spec.ts:238` |
| T317 | uploaded file appears in shared context section |  | `e2e/specs/orch/orch.spec.ts:254` |
| T318 | removing a file removes it from context bar |  | `e2e/specs/orch/orch.spec.ts:268` |
| T319 | unsupported file type can still be uploaded (read as text) |  | `e2e/specs/orch/orch.spec.ts:286` |
| T320 | file content appears in conversation history sent to agents |  | `e2e/specs/orch/orch.spec.ts:301` |

### T321–T327 Failed Step Handling

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T321 | rate-limit error shows failed-step card instead of crashing |  | `e2e/specs/orch/orch.spec.ts:343` |
| T322 | failed-step card shows the agent name |  | `e2e/specs/orch/orch.spec.ts:362` |
| T323 | rate-limit failed card contains quota messaging |  | `e2e/specs/orch/orch.spec.ts:380` |
| T324 | protocol continues for remaining agents after one fails |  | `e2e/specs/orch/orch.spec.ts:401` |
| T325 | failed-step card is added to localStorage transcript |  | `e2e/specs/orch/orch.spec.ts:429` |
| T326 | no silent failure — every failed agent produces a visible card |  | `e2e/specs/orch/orch.spec.ts:449` |
| T327 | send button re-enables after failed round completes |  | `e2e/specs/orch/orch.spec.ts:466` |

## SYNC

### T400–T406 Local-First Persistence

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T400 | chat saves to localStorage immediately on creation |  | `e2e/specs/sync/sync.spec.ts:33` |
| T401 | agent profile saves to localStorage immediately on creation |  | `e2e/specs/sync/sync.spec.ts:50` |
| T402 | local data survives a hard refresh (F5) |  | `e2e/specs/sync/sync.spec.ts:64` |
| T403 | UI reflects saved local state without cloud |  | `e2e/specs/sync/sync.spec.ts:77` |
| T404 | multiple chats save without overwriting each other |  | `e2e/specs/sync/sync.spec.ts:94` |

### T414–T420 Offline-First

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T414 | existing local chats remain accessible when offline |  | `e2e/specs/sync/sync.spec.ts:123` |
| T415 | agent profiles remain accessible when offline |  | `e2e/specs/sync/sync.spec.ts:146` |
| T416 | new changes made while offline persist to localStorage |  | `e2e/specs/sync/sync.spec.ts:160` |
| T417 | app does not crash when network requests fail |  | `e2e/specs/sync/sync.spec.ts:180` |
| T418 | localStorage writes succeed while offline |  | `e2e/specs/sync/sync.spec.ts:192` |

### T421–T426 Firestore Namespace

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T421 | localStorage uses user-scoped keys for authenticated data |  | `e2e/specs/sync/sync.spec.ts:212` |
| T422 | anonymous user data is stored under anonymous key prefix |  | `e2e/specs/sync/sync.spec.ts:228` |
| T423 | anonymous and authenticated data are in separate localStorage namespaces |  | `e2e/specs/sync/sync.spec.ts:241` |
| T424 | user-specific data is not accessible in anonymous namespace |  | `e2e/specs/sync/sync.spec.ts:263` |

## OPER

### T500–T506 Token and Cost Visibility

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T500 | metrics dashboard is visible in the header | ✓ | `e2e/specs/oper/oper.spec.ts:43` |
| T501 | per-model metrics section is present |  | `e2e/specs/oper/oper.spec.ts:47` |
| T502 | token/cost estimate is tracked after a round |  | `e2e/specs/oper/oper.spec.ts:51` |
| T503 | cost estimate renders with dollar prefix |  | `e2e/specs/oper/oper.spec.ts:67` |
| T504 | daily request counter increments after each round |  | `e2e/specs/oper/oper.spec.ts:84` |
| T505 | token metrics do not block orchestration execution |  | `e2e/specs/oper/oper.spec.ts:99` |
| T506 | formatTokenCount renders M suffix for large counts |  | `e2e/specs/oper/oper.spec.ts:112` |

### T507–T513 Soft and Hard Token Limits

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T507 | soft limit warning banner appears when context approaches limit |  | `e2e/specs/oper/oper.spec.ts:123` |
| T508 | soft limit banner has ARIA live region for screen readers |  | `e2e/specs/oper/oper.spec.ts:138` |
| T509 | daily quota meter shows progress towards free tier limit |  | `e2e/specs/oper/oper.spec.ts:145` |
| T510 | meter bar shows warning class when approaching limit |  | `e2e/specs/oper/oper.spec.ts:150` |
| T511 | rate limit per minute is shown in metrics |  | `e2e/specs/oper/oper.spec.ts:168` |

### T514–T520 Context Overflow

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T514 | conversation history uses round-based windowing |  | `e2e/specs/oper/oper.spec.ts:177` |
| T515 | older rounds are compressed to moderator-only in context |  | `e2e/specs/oper/oper.spec.ts:222` |
| T516 | long conversation stays responsive (no O(n²) growth) |  | `e2e/specs/oper/oper.spec.ts:258` |

### T521–T526 Shell Token Alignment

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T521 | header is rendered with SAC styling | ✓ | `e2e/specs/oper/oper.spec.ts:304` |
| T522 | sidebar is rendered without layout breakage | ✓ | `e2e/specs/oper/oper.spec.ts:309` |
| T523 | core routes load without visual overlap |  | `e2e/specs/oper/oper.spec.ts:315` |
| T524 | SAC token custom properties are defined in page styles |  | `e2e/specs/oper/oper.spec.ts:327` |
| T525 | neon green accent token is applied correctly |  | `e2e/specs/oper/oper.spec.ts:334` |
| T526 | header height token matches actual header height |  | `e2e/specs/oper/oper.spec.ts:341` |

### T535–T542 ARIA and Focus Visibility

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T535 | login form inputs have aria-label attributes |  | `e2e/specs/oper/oper.spec.ts:352` |
| T536 | guest button has descriptive aria-label |  | `e2e/specs/oper/oper.spec.ts:359` |
| T537 | chat send button has aria-label |  | `e2e/specs/oper/oper.spec.ts:367` |
| T538 | chat message input has aria-label |  | `e2e/specs/oper/oper.spec.ts:376` |
| T539 | transcript navigation buttons have aria-labels |  | `e2e/specs/oper/oper.spec.ts:385` |
| T540 | profiles intent panel has aria-label on textarea |  | `e2e/specs/oper/oper.spec.ts:396` |
| T541 | profiles edit and delete buttons have aria-labels |  | `e2e/specs/oper/oper.spec.ts:404` |
| T542 | confirm dialog has role=dialog and aria-labelledby |  | `e2e/specs/oper/oper.spec.ts:413` |

### Ungrouped

| ID | Test | Smoke | Location |
| :--- | :--- | :---: | :--- |
| T527 | login form has all required test IDs | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:20` |
| T528 | register form has all required test IDs | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:30` |
| T529 | dashboard has start-chat CTA | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:42` |
| T530 | chat page has message input and send button | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:50` |
| T531 | chat transcript nav buttons are present | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:59` |
| T532 | profiles page has new agent and reset buttons | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:79` |
| T533 | profiles list shows edit and delete buttons for each profile | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:89` |
| T534 | chat history drawer shows empty state when no chats | ✓ | `e2e/specs/oper/oper-005-smoke.spec.ts:101` |
