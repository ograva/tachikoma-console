# SYNC-002 Restore Data Across Devices

Story ID: SYNC-002
Module Prefix: SYNC
Priority: High
Implementation Status: Existing
Architecture Component: src/app/services/firestore.service.ts; src/app/services/user-profile.service.ts; src/app/services/chat-storage.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Restore Data Across Devices

User Statement: As an authenticated user, I want SAC data to appear on another device so that I can continue my work anywhere.

Acceptance Criteria:

- Cloud-backed chats, profiles, and settings can be loaded on a new authenticated device.
- Restore logic preserves timestamps needed for conflict resolution.
- Encrypted fields are decrypted only after authorized retrieval.
- Recovery logic respects the user's chosen sync strategy.
- Restored SAC records resolve from namespaced Firestore paths under `apps/sac`.

data-test-id:

- restore-on-login
- sync-strategy-badge
- cloud-load-status
- restore-complete-status
