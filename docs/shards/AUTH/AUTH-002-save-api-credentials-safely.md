# AUTH-002 Save API Credentials Safely

| Field | Value |
| :--- | :--- |
| **Shard ID** | AUTH-002 |
| **Module** | AUTH - Identity, Access, and Secure Configuration |
| **Story Ref** | AUTH-002 |
| **Priority** | High |
| **Status** | Not Started |
| **Complexity** | M |
| **Depends On** | AUTH-001 |

## Description

Implement safe API credential management so users can store and reuse their key without repeated input. The shard must preserve the local plaintext plus cloud encryption policy and provide actionable validation feedback. This behavior is foundational for reliable model execution across sessions.

## Acceptance Criteria

- [ ] API key entry and save flow is available from profile/settings surfaces and validates before use.
- [ ] Cloud writes store only encrypted key material while local storage keeps plaintext per policy.
- [ ] Invalid or malformed key states show actionable user-facing feedback and do not corrupt profile state.

## Test Coverage

- [ ] Unit: User profile and encryption service behavior for key validation, encrypt/decrypt, and save/restore paths with Firebase writes mocked.
- [ ] E2E: Profile API key save and validation states including failure handling (T010-T014).

## Dev Notes

- Constraint-critical: no unencrypted cloud key writes; local-first updates must remain immediate.
- Touch points: `src/app/services/user-profile.service.ts`, `src/app/services/encryption.service.ts`, `src/app/pages/profile/*`.
- Keep API key feedback and controls discoverable and keyboard accessible.
- UI Task Ref: UI-TB-007.
