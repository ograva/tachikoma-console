# AUTH-001 Sign In and Resume

| Field | Value |
| :--- | :--- |
| **Shard ID** | AUTH-001 |
| **Module** | AUTH - Identity, Access, and Secure Configuration |
| **Story Ref** | AUTH-001 |
| **Priority** | High |
| **Status** | Not Started |
| **GitHub Issue** | #39 |
| **Complexity** | M |
| **Depends On** | None |

## Description

Implement the authentication and resume baseline so users can enter SAC using email/password or anonymous mode and continue active work safely. This shard establishes the auth gate required by all other persisted behaviors. Local-first session continuity must remain stable across refreshes and sign-in transitions.

## Acceptance Criteria

- [ ] Users can sign in with email/password and continue anonymously from the authentication entry surface.
- [ ] Authenticated sessions restore workspace access without deleting existing local data.
- [ ] Logout removes authenticated cloud access for the active session while preserving local-first architecture rules.

## Test Coverage

- [ ] Unit: Auth service sign-in mode handling, session state transitions, and logout behavior with Firebase auth mocked via test doubles.
- [ ] E2E: Authentication happy-path and anonymous-path login flow with resume behavior (T000-T004).

## Dev Notes

- Follow constraints in `docs/context/CONSTRAINTS.md` for Firebase Auth and local-first operation.
- Touch points: `src/app/services/auth.service.ts`, `src/app/pages/authentication/*`, `src/app/app.routes.ts`.
- Ensure `data-test-id` values in story are preserved on interactive auth controls.
- UI Task Ref: UI-TB-007.


