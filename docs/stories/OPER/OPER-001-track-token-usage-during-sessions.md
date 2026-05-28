# OPER-001 Track Token Usage During Sessions

Story ID: OPER-001
Module Prefix: OPER
Priority: High
Implementation Status: Partial
Architecture Component: src/app/pages/tachikoma-chat/*; src/reference/tech-folder/TOKEN_COUNTER.md
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Track Token Usage During Sessions

User Statement: As a user, I want to see how much context and token budget a chat is consuming so that I can manage long sessions intentionally.

Acceptance Criteria:

- SAC tracks input and output token totals at the chat level.
- Usage can be compared against a model-specific context limit.
- Warning thresholds exist before context exhaustion.
- Token counters reset appropriately when switching chats or starting a new message cycle.
- Token telemetry is advisory and should not block normal usage unless a future decision changes that rule.

data-test-id:

- token-meter
- token-count-current
- token-threshold-warning
- token-reset-on-chat-switch
