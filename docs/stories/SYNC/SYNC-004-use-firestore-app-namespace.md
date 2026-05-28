# SYNC-004 Use Firestore App Namespace

Story ID: SYNC-004
Module Prefix: SYNC
Priority: High
Implementation Status: Gap
Architecture Component: src/app/services/firestore.service.ts; src/app/services/chat-storage.service.ts; src/app/services/agent-profile.service.ts; src/app/services/user-profile.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Use Firestore App Namespace

User Statement: As a platform maintainer, I want SAC data written under an app-specific Firestore prefix so that it does not collide with other apps in the same Firebase project.

Acceptance Criteria:

- All SAC Firestore collection paths are rooted under `apps/sac`.
- Chat, agent, and user profile documents resolve to the namespaced path shape.
- Reads and writes are backward-compatible only through a controlled migration policy.
- Sync and restore behaviors continue to work with namespaced paths.

data-test-id:

- firestore-namespace-path
- sync-namespaced-write
- sync-namespaced-read
- namespace-migration-status
