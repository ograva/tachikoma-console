# DECISION_LOG.md

| ID | Date | Status | Decision |
| :---- | :---- | :---- | :---- |
| ADL-001 | 2026-05-28 | Draft | Use live TypeScript model files as the canonical source of truth for SAC data contracts. |
| ADL-002 | 2026-05-28 | Draft | Treat SAC as an Angular-first, frontend-heavy SPA with local-first state and optional Firebase sync. |
| ADL-003 | 2026-05-28 | Draft | Separate detailed user stories into docs/stories by module prefix and keep Architecture.md strategic. |
| ADL-004 | 2026-05-28 | Draft | Treat chat orchestration as a dedicated architectural concern because protocol, token, and rate-limit behavior are coupled in the live app. |
| ADL-005 | 2026-05-28 | Draft | Preserve current localStorage-first persistence and Firestore forwarding semantics, but require explicit conflict-resolution design in future revisions. |
| ADL-006 | 2026-05-28 | Draft | Normalize API-key handling as a browser-local secret with encrypted cloud backup, not as a server-managed secret store. |
| ADL-007 | 2026-05-29 | Draft | Treat `roundId` and round-based context trimming as first-class chat protocol data rather than incidental UI state. |
| ADL-008 | 2026-05-29 | Draft | Keep rate limiting and token telemetry client-side for now, but document that enforcement is advisory and not authoritative. |
| ADL-009 | 2026-05-29 | Draft | Preserve the current agent snapshot model in chat sessions so historical chats remain reproducible after persona edits. |
| ADL-010 | 2026-05-29 | Draft | Keep Firestore as a forwarded cloud mirror of localStorage for authenticated users instead of making it the primary runtime store. |
| ADL-011 | 2026-05-29 | Draft | Use AI-assisted persona drafting as the default creation path (basic mode), with advanced structured editing retained as an optional expert workflow. |
| ADL-012 | 2026-05-29 | Draft | Replace unbounded chat-history replay with a layered context policy: pinned facts + rolling recent rounds + compact session summary under explicit token budgets. |
| ADL-013 | 2026-05-29 | Draft | Make agent failures explicit in transcript state, apply bounded retry with reduced context, and prohibit silent agent skipping during protocol execution. |
| ADL-014 | 2026-05-29 | Draft | Separate API-subscription assumptions from API-project quota enforcement; token and throttle telemetry remain advisory unless elevated by explicit product decision. |
| ADL-015 | 2026-05-29 | Draft | Treat v1.3 architecture behaviors as immediate PRD baseline scope rather than deferred enhancements. |
| ADL-016 | 2026-05-29 | Draft | Make failed-persona-step UX mandatory in v1.3 with explicit transcript state and user-facing failure messaging after bounded retry exhaustion. |
| ADL-017 | 2026-05-29 | Draft | Namespace SAC Firestore collections under `/apps/sac` to prevent collisions with other apps in shared Firebase projects. |
