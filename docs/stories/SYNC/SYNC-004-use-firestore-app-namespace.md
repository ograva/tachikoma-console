# SYNC-004 Use Dedicated Firestore Database Isolation

Story ID: SYNC-004
Module Prefix: SYNC
Priority: High
Implementation Status: Gap
Architecture Component: src/app/services/firestore.service.ts; src/app/services/chat-storage.service.ts; src/app/services/agent-profile.service.ts; src/app/services/user-profile.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CanonicalDataModelSpec.md; docs/context/CONSTRAINTS.md

Title: Use Dedicated Firestore Database Isolation

User Statement: As a platform maintainer, I want SAC data written to a dedicated Firestore database so that it does not collide with other apps in the same Firebase project.

Acceptance Criteria:

- SAC reads and writes target the SAC-dedicated Firestore database.
- Chat, agent, and user profile documents resolve to canonical `/users/{userId}/...` paths inside that database.
- Reads and writes are backward-compatible only through a controlled migration policy.
- Sync and restore behaviors continue to work after prefix removal.

data-test-id:

- firestore-database-isolation
- sync-dedicated-db-write
- sync-dedicated-db-read
- dedicated-db-migration-status
