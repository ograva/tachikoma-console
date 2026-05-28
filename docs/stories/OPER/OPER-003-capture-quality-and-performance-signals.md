# OPER-003 Capture Quality And Performance Signals

Story ID: OPER-003
Module Prefix: OPER
Priority: Medium
Implementation Status: Gap
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/services/firestore.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Capture Quality And Performance Signals

User Statement: As the product team, we want to capture session quality and performance metrics so that we can improve SAC based on evidence.

Acceptance Criteria:

- The app records latency and request-volume signals per session.
- Structured output validity can be measured at the protocol level.
- Product metrics can be aggregated without storing user secrets.
- Collected signals map directly to the PRD success metrics.

data-test-id:

- session-telemetry-event
- protocol-validation-counter
- latency-metric-event
- analytics-privacy-guard
