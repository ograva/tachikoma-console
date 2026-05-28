# OPER-002 Handle Quota And Throttle Failures

Story ID: OPER-002
Module Prefix: OPER
Priority: High
Implementation Status: Partial
Architecture Component: src/app/pages/tachikoma-chat/*; src/app/services/user-profile.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Handle Quota And Throttle Failures

User Statement: As a user, I want clear feedback when SAC hits rate or quota limits so that I know what happened and what to do next.

Acceptance Criteria:

- The system tracks requests in a rolling time window.
- Retry behavior is bounded and documented.
- Quota or throttle failures present actionable messaging.
- Errors increment diagnostics without corrupting session state.
- Quota and throttle messaging distinguishes API-project quota status from app subscription assumptions.

data-test-id:

- rate-limit-warning
- quota-exceeded-message
- retry-attempt-status
- request-diagnostics-panel
