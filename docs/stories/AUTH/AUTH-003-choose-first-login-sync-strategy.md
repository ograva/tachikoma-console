# AUTH-003 Choose First-Login Sync Strategy

Story ID: AUTH-003
Module Prefix: AUTH
Priority: High
Implementation Status: Existing
Architecture Component: src/app/components/sync-dialog/*; src/app/services/firestore.service.ts; src/app/services/auth.service.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Choose First-Login Sync Strategy

User Statement: As a user logging in on a device with existing local data, I want to choose how SAC syncs local and cloud data so that I do not lose work.

Acceptance Criteria:

- First authenticated login with both local and cloud data triggers a sync strategy dialog.
- Users can choose merge, cloud-to-local, or local-to-cloud.
- The selected strategy deterministically updates chats, profiles, and settings.
- If cloud sync fails after a valid local save, the app remains usable locally.
- The strategy operates within the local-first, Firestore-forward architecture.

data-test-id:

- sync-dialog
- sync-option-merge
- sync-option-cloud-to-local
- sync-option-local-to-cloud
- sync-confirm-action
