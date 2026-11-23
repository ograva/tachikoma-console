# OPER-007 See Operational Limits In A Compact Status Bar

Story ID: OPER-007
Module Prefix: OPER
Priority: Medium
Implementation Status: Existing (documented retroactively, as built)
Architecture Component: src/app/pages/tachikoma-chat/* (`primaryModel`, `primaryModelMetrics`, `requestMetrics`, `maxRequestsPerMinute`, `TOKEN_WARNING_THRESHOLD`, `contextSoftWarning`)
Design Reference: docs/context/designs/Wireframe_ChatRoundtable.md (as built; the status bar appears in both orientations); docs/context/designs/Landscape_Roundtable_Panel_Layout.md §2 (original spec; see its As-Built Deltas)
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: See Operational Limits In A Compact Status Bar

User Statement: As a user running multi-agent rounds, I want a single compact status line showing my model, throughput and context usage so that I can tell when I'm approaching a limit without giving up screen space for the conversation.

Acceptance Criteria:

- A compact status bar is shown at the bottom of the chat page in both portrait and landscape layouts.
- The left side shows a `SECURE-LINK` indicator, the primary model name, and a `PROCESSING` segment while a round is running.
- The right side shows tokens per minute (`TPM: used/limit`), context window usage (`CTX: n%`) and requests per minute (`RPM: used/limit`), each with a tooltip naming the metric. TPM and CTX appear only when metrics exist for the primary model.
- TPM, CTX and RPM each take a warning style above `TOKEN_WARNING_THRESHOLD` of their limit and a danger style above 95%.
- The `SECURE-LINK` indicator takes the warning style when the context soft-limit warning is active. It does not reflect cloud sync or network state.
- A `ROUND n` segment shows `currentRoundId`: the number of completed rounds, or the zero-based index of the round in progress while agents are working.
- Status bar values update as rounds run, without blocking orchestration.

data-test-id:

- chat-status-bar
- Pending Design Gaps (ids to be assigned from Eunice's gap list): the sync indicator, model, processing, TPM, CTX, RPM and round segments.

Follow-ups (not part of this as-built story; candidates for new stories):

- Make the sync segment reflect real sync and network state (`SYNCING…`, `OFFLINE`), as in the original spec. Today it can read `SECURE-LINK` while offline.
- Reconcile round numbering with the roundtable navigator: the status bar shows `ROUND 0` during the first round, while the navigator shows `ROUND 1 OF 1`.

Related: partially resolves PRD open question #2 (how much token and quota visibility to surface in the UI).
