# Tachikoma Console - Copilot Instructions (Synced v1.3)

## Source of Truth

When there is any conflict, follow this order:
1. `docs/context/CONSTRAINTS.md`
2. `docs/context/Architecture.md`
3. `docs/context/CanonicalDataModelSpec.md`
4. `docs/context/PRD.md`
5. `docs/stories/**`

Do not treat old notes in `src/reference/tech-folder/` as canonical if they conflict with `docs/context/`.

## Branching, Commits, and Pushes

- Always ask the user before committing.
- Always ask the user before pushing to `main`.
- Never auto-commit or auto-push.
- If committing to `main`, update the version badge in `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`.

## Platform Baseline

- Framework: Angular 20, standalone components.
- Language: TypeScript.
- Styling: SCSS.
- Build: Angular CLI.
- Cloud: Firebase Auth + Firestore.
- AI SDK: `@google/genai`.
- Default model policy: Gemini 3.5 Flash, with Gemini 3.1 fallback.
- PWA required for production builds.

## Architecture Baseline (v1.3)

- Treat v1.3 behavior as active scope, not future scope.
- App is frontend-heavy and local-first.
- Orchestration remains client-side unless explicitly re-decided.
- Firestore is a forwarded cloud mirror for authenticated users.

### Mandatory v1.3 Behaviors

1. Persona creation defaults to AI-assisted basic mode:
   - User describes intent in plain language.
   - System generates draft persona.
   - Advanced form/XML/plaintext editing remains optional.

2. Context assembly uses layered token budgeting:
   - Pinned facts
   - Recent rolling rounds
   - Compact summary
   - Current user turn

3. Failed persona steps are mandatory UX states:
   - Retry is bounded.
   - If retry is exhausted, render explicit failed-step transcript message.
   - Silent skipping is prohibited.

4. Quota handling:
   - Distinguish API-project quota/billing from app subscription assumptions.

## Firestore Namespace Requirement

This Firebase project is shared with other apps.

All SAC collections must be namespaced under:
- `apps/sac/users/{userId}/chat_sessions/{chatId}`
- `apps/sac/users/{userId}/agent_profiles/{agentId}`
- `apps/sac/users/{userId}/user_profile/{userId}`

Do not create or read SAC collections outside the `apps/sac` prefix.

## Data Contract Rules

- `src/app/models` defines canonical shapes.
- Normalize all persisted reads to model defaults.
- Remove `undefined` before Firestore writes.
- Preserve `createdAt` and `updatedAt` for syncable entities.
- Chat snapshots must keep historical participating agents.
- Do not mutate historical chat sessions when global agent profiles change.

### ChatMessage v1.3 expectation

Chat transcript entries may include failure state fields:
- `status?: 'ok' | 'failed'`
- `failureCode?: string`
- `failureMessage?: string`

## Security Rules

- Keep API keys plaintext only in localStorage.
- Encrypt API keys before Firestore writes.
- Keep per-user data isolation in Firestore rules and paths.
- Do not introduce new secret storage mechanisms without an explicit architecture decision.

## UI/UX Stack Rules

- Primary components: Angular Material.
- Interaction primitives: Angular CDK.
- Icons: Tabler.
- Localization: ngx-translate.
- Avoid introducing Bootstrap/Tailwind/competing component systems by default.

## Implementation Guidance for Agents

- Prefer smallest safe changes.
- Preserve local-first behavior for writes.
- Keep cloud sync async and non-blocking for UI.
- If touching orchestration, preserve sequential deterministic behavior unless explicitly redesigning.
- For any new v1.3 behavior, add/update story references in `docs/stories/`.

## Story Coverage Expectations

Active v1.3 stories include additional required IDs:
- `AGNT-004` Draft Persona From Intent
- `ORCH-004` Handle Failed Persona Steps Explicitly
- `SYNC-004` Use Firestore App Namespace

When implementing related features, ensure these stories remain aligned.

## Testing Focus

When changing orchestration, persona creation, or sync:
- Verify failed-step UX appears and no silent skip occurs.
- Verify context trimming follows layered policy.
- Verify namespaced Firestore path construction under `apps/sac`.
- Verify local-first behavior still works offline.

## What Not To Do

- Do not convert app to backend-first architecture.
- Do not bypass model normalization.
- Do not use deprecated Gemini defaults as system defaults.
- Do not store unencrypted cloud API keys.
- Do not write SAC data outside `apps/sac` namespace.
