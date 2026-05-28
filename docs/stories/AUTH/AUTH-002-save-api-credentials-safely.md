# AUTH-002 Save API Credentials Safely

Story ID: AUTH-002
Module Prefix: AUTH
Priority: High
Implementation Status: Existing
Architecture Component: src/app/services/user-profile.service.ts; src/app/services/encryption.service.ts; src/app/pages/profile/*
Constraint Reference: docs/context/Architecture.md; docs/context/CONSTRAINTS.md

Title: Save API Credentials Safely

User Statement: As a user bringing my own model key, I want SAC to store my API credential safely so that I can use the app without repeatedly re-entering the key.

Acceptance Criteria:

- API key entry is available from the user profile or settings surface.
- Saved keys are immediately usable for model operations after validation.
- Cloud-stored credentials are encrypted before upload.
- Missing, invalid, or malformed keys produce actionable feedback.

data-test-id:

- profile-api-key-input
- profile-api-key-save
- profile-api-key-visibility-toggle
- profile-api-key-status
