# AUTH-001 Sign In And Resume

Story ID: AUTH-001
Module Prefix: AUTH
Priority: High
Implementation Status: Existing
Architecture Component: src/app/services/auth.service.ts; src/app/layouts/blank/blank.component.*; src/app/app.routes.ts
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Sign In And Resume

User Statement: As a returning user, I want to sign in and resume my saved SAC workspace so that my chats and settings persist across sessions.

Acceptance Criteria:

- Users can authenticate with email/password or continue anonymously.
- Authenticated users can access their persisted workspace without losing existing local data.
- Session state persists until logout or explicit session termination.
- Logout removes access to authenticated cloud-backed data in the active session.

data-test-id:

- auth-email-input
- auth-password-input
- auth-login-submit
- auth-anonymous-submit
- auth-logout-action
