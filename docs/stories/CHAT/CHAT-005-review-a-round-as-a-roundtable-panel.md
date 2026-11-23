# CHAT-005 Review A Round As A Roundtable Panel

Story ID: CHAT-005
Module Prefix: CHAT
Priority: Medium
Implementation Status: Existing (documented retroactively, as built)
Architecture Component: src/app/pages/tachikoma-chat/* (`isLandscape`, `selectedViewRoundId`, `prevRound()`, `nextRound()`, `getAgentMessageForRound()`, `getUserPromptForRound()`)
Design Reference: docs/context/designs/Wireframe_ChatRoundtable.md (as built); docs/context/designs/Landscape_Roundtable_Panel_Layout.md (original spec; see its As-Built Deltas)
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Review A Round As A Roundtable Panel

User Statement: As a user on a tablet, laptop or desktop in landscape, I want to see one round of the discussion as side-by-side agent columns so that I can compare each persona's contribution and the moderator's synthesis without scrolling a long vertical transcript.

Acceptance Criteria:

- The roundtable layout is active when the viewport is at least 768px wide and wider than it is tall. Otherwise the portrait transcript is shown. The layout re-evaluates on window resize, and switching into landscape jumps the view to the latest round.
- In roundtable mode the prompt input, attach-file and send controls sit above the round navigation bar, and the agent columns fill the space below.
- Each agent in the chat's roster gets one column, in roster order, headed by its name, colour and a CHATTER or MODERATOR badge. The moderator's column is visually distinguished. Columns share the width equally (CSS `repeat(auto-fit, minmax(240px, 1fr))`), so the layout adapts to any roster size.
- The round navigation bar shows `ROUND n OF m`, where `n` is the viewed round (1-based) and `m` is the number of completed rounds plus the live round being composed. The previous button is disabled on round 1, and the next button is disabled on the live round.
- The navigation bar shows the user prompt for the viewed round, or an empty-prompt placeholder on the live round before a prompt is sent.
- For the viewed round each column shows that agent's message. While the live round is processing, an agent that is still working shows a thinking indicator. An agent that produced no message in a round that has a prompt shows a `SILENCE` placeholder. On a round with no prompt, the columns show an empty state.
- Completing a round moves the view to the round just completed.
- The compact status bar (OPER-007) stays visible in roundtable mode.

data-test-id:

- chat-message-input
- chat-send-btn
- chat-attach-file-btn-landscape
- chat-round-prev-btn
- chat-round-next-btn
- chat-round-indicator
- chat-agent-message
- Pending Design Gaps (ids to be assigned from Eunice's Wireframe_ChatRoundtable.md gap list): roundtable container, each agent column, the round prompt preview, and the silence placeholder.

Follow-ups (not part of this as-built story; candidates for new stories):

- Original spec deltas: a fixed four-column grid with a wider moderator column, and a moderator column forced to the far right.
