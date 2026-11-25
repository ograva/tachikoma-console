# Migration Plan: `@google/genai` (BYOK) → Firebase AI Logic

| Version | Status | Date | Owner |
| :--- | :--- | :--- | :--- |
| 0.2 | Decisions recorded (D5 pending spike) | 2026-11-25 | Watson (Architect), with Jason (PM) |
| 0.1 | Draft: awaiting owner decisions | 2026-11-24 | Watson (Architect), with Jason (PM) |

> Planning document. Nothing here is approved until the owner decides D1–D8. Once approved, it is carried through the cohort phases (§7) and the decisions are logged as ADL entries.

## 1. Why

Today every user brings their own Gemini API key (BYOK). The key is entered in the chat header, validated against the REST API, encrypted (`EncryptionService`) and synced to Firestore. That design causes most of the open API-key defects (STABILISATION_TRIAGE A1, A2, A3; AUTH T010–T014). It also makes first use harder: no key, no product.

Firebase AI Logic calls Gemini through a Firebase-managed proxy. **The client never holds a Gemini key.** Calls are authorised by the Firebase project and protected by App Check.

## 2. Facts from the current Firebase docs (read 2026-11-24)

| Topic | Fact | Source |
| :--- | :--- | :--- |
| SDK | `firebase/ai` inside the existing `firebase` package: `getAI(app, { backend: new GoogleAIBackend() })` → `getGenerativeModel(ai, { model, systemInstruction, generationConfig })` → `generateContent`, `generateContentStream`, `startChat`, `countTokens`. `VertexAIBackend` was removed in SDK v13; it is now `AgentPlatformBackend`. Pin ≥ 12.17.0 (we have `^12.6.0`). | [get-started](https://firebase.google.com/docs/ai-logic/get-started?platform=web), [FAQ](https://firebase.google.com/docs/ai-logic/faq-and-troubleshooting) |
| @angular/fire | Not mentioned. The web guide is framework-independent; using the `FirebaseApp` from @angular/fire is **unverified** and needs a spike. | n/a |
| Credentials | The key stays on the server. The web `apiKey` only identifies the project. **No documented bring-your-own-key path.** | [overview](https://firebase.google.com/docs/ai-logic) |
| Providers | **Gemini Developer API:** works on Spark (no billing) with a free tier; global only; no Cloud Storage URLs. **Agent Platform Gemini API:** Blaze required; location selectable; Cloud Storage URLs. Rate limits (RPM/RPD/TPM/TPD) apply **per project**. | [pricing](https://firebase.google.com/docs/ai-logic/pricing), [quotas](https://firebase.google.com/docs/ai-logic/quotas) |
| Abuse protection | App Check for web uses **reCAPTCHA Enterprise**. It has been **auto-enforced since 2026-11-02**; un-enforcing is possible until 2027-01-21. Limited-use tokens (`useLimitedUseAppCheckTokens: true`) give replay protection. Local dev uses an App Check debug token. | [app-check](https://firebase.google.com/docs/ai-logic/app-check) |
| Per-user limit | Default **100 requests/min per user**, configurable in Cloud Console quotas for `firebasevertexai.googleapis.com`. It can't be set for an individual user. | [quotas](https://firebase.google.com/docs/ai-logic/quotas) |
| Model parameters | **Gemini 4.x and the latest 3.x models do not support temperature, topK or topP** (nor frequency/presence penalty or candidate count). `maxOutputTokens` and `thinkingLevel` are supported. | [FAQ](https://firebase.google.com/docs/ai-logic/faq-and-troubleshooting), [model-parameters](https://firebase.google.com/docs/ai-logic/model-parameters) (not yet read in full) |
| Models | Stable: `gemini-4-hydrogen` (featured; works on Spark), `gemini-3.8-flash`, `gemini-3.5-flash-lite`. Avoid `-preview` and `-latest` aliases in production. Remote Config parameter `model_name` lets the model change without a release. | [models](https://firebase.google.com/docs/ai-logic/models), [remote model name](https://firebase.google.com/docs/ai-logic/change-model-name-remotely) |
| Inputs | Request limit 20 MB total, so inline data is for small files only. | [input files](https://firebase.google.com/docs/ai-logic/input-file-requirements) |
| Errors | `403` App Check / API restriction · `404` model gone · `429` quota or overload · `401` when authenticated-users mode is on. | [error codes](https://firebase.google.com/docs/ai-logic/error-codes) |
| Testing | **No Emulator Suite support** was found. Live calls use real quota. | n/a (confirm in the Emulator docs) |
| Production checklist | Enforce App Check and replay protection, restrict the web API key (referrer and API allowlist), consider authenticated-users mode, AI monitoring, budgets, stable model names with Remote Config, and separate dev/test/prod projects. | [checklist](https://firebase.google.com/docs/ai-logic/production-checklist) |

Not yet read in full: system instructions, count tokens, model parameters, safety settings, structured output, monitoring, auth mode. Read these during the spike (§6).

## 3. Current usage inventory

| Call site | Purpose | Today | Under AI Logic |
| :--- | :--- | :--- | :--- |
| `pages/tachikoma-chat/tachikoma-chat.component.ts` ~1416–1480 (`callGemini`) | Each agent turn: `countTokens`, then `generateContent` with `systemInstruction`, `temperature`, `topP`, `topK`, `maxOutputTokens: 8192` | `new GoogleGenAI({ apiKey })` on every call | `getGenerativeModel(ai, { model, systemInstruction, generationConfig })`. **temperature, topP and topK are dropped or rejected on current models (D5).** |
| same file ~867, ~921 | List models; read `inputTokenLimit`/`outputTokenLimit` (these feed the status bar CTX %) | REST `generativelanguage…/models?key=` | No equivalent without a key. Use a static model-metadata table, optionally overridden by Remote Config. |
| same file ~1596 | Detect free-tier exhaustion by error string | Parses `generate_content_free_tier_requests` | Map AI Logic `429` / `403` to the existing failed-step card (ORCH-004). |
| `pages/tachikoma-profiles/tachikoma-profiles.component.ts` ~461, ~596 | "Draft persona from intent" (AGNT-004) and "AI convert" (AGNT-003) | REST `…gemini-3.5-flash:generateContent?key=` (hard-coded model; reads the key from localStorage) | The same AI service as chat; structured output (`responseSchema`) instead of JSON parsing. |
| `services/user-profile.service.ts` ~254 | Validate the API key | REST `…/models?key=` | Removed. |

**BYOK-only code and docs that go away (or are superseded):**
- **Key handling:** `geminiApiKey` / `geminiApiKeyEncrypted` in `UserProfile` and `user-profile.service.ts`; `EncryptionService`, whose only consumer is the key.
- **Key UI:** `ApiKeySyncDialogComponent`; the chat header key block and INIT button; the profile page's key field and the rate-limit tier selector (15 / 1000 RPM).
- **Quota metering:** the free-tier quota meters in the status bar.
- **Tests:** `e2e/helpers/gemini-mock.helper.ts`, which mocks the `generativelanguage.googleapis.com` routes; AUTH T010–T014; STABILISATION_TRIAGE A1, A2, A3 and T5.
- **Requirements and decisions:** AUTH-002 "Save API credentials safely", ADL-006 "Browser-local API key with encryption", and the parts of CONSTRAINTS.md that assume BYOK.
- **Stored data:** existing `geminiApiKeyEncrypted` values in Firestore `user_profile` docs. Delete them during migration rather than leave ciphertext behind (D7).

## 4. Owner decisions needed

| # | Decision | Options | Recommendation |
| :- | :--- | :--- | :--- |
| D1 | Bring-your-own-key | (a) Drop BYOK entirely. (b) Keep `@google/genai` BYOK as an "advanced" fallback beside AI Logic. | **(a) Drop it.** There is no supported BYOK path in AI Logic, and two AI stacks double the test surface and keep every API-key defect alive. |
| D2 | Provider | (a) Gemini Developer API (Spark free tier, global). (b) Agent Platform (Blaze, regional, Cloud Storage URLs). | **(a) to start.** Switching later is a backend-constructor change. Attachments are small inline text today. |
| D3 | Who can call AI | (a) Signed-in users only (authenticated-users mode). (b) Also anonymous guests (Firebase anonymous auth counts as authenticated). (c) Unauthenticated too. | **(b).** Guests keep a "try it now" path while every call stays tied to a Firebase uid for per-user limits. Revisit if abuse shows up. |
| D4 | Cost and abuse controls | Per-user RPM (default 100), budget alerts, limited-use App Check tokens. | Lower the per-user limit to fit one multi-agent round (about 4–6 calls), e.g. **20 RPM**. Enable limited-use tokens. Add a budget alert. The owner sets these in the console. |
| D5 | **Persona temperature** | (a) Keep temperature: choose a model that still supports it, if any (spike). (b) Drop per-agent temperature; differentiate personas only by system instruction and `thinkingLevel`. (c) Map the existing `temp` field to `thinkingLevel` or prompt style. | **Spike first, then decide.** This changes AGNT-002 and the persona model. Jason owns the product call. |
| D6 | Model selection UI | (a) Keep the per-agent and per-user model pickers with an approved list from Remote Config. (b) One project-wide model, set remotely. | **(a)**, with the list and token limits served from Remote Config plus a static fallback table. No `-preview` / `-latest` models. |
| D7 | Existing stored keys | (a) Delete `geminiApiKey*` from local storage and Firestore on first run after migration. (b) Leave them. | **(a).** Avoids lingering secrets. Tell users once. |
| D8 | Testing strategy | No emulator exists. | Playwright `page.route` mocks on the real proxy host (confirm it in the spike) for the whole suite, plus a small `@live` smoke suite against a dev project with an App Check debug token. It doesn't run in CI by default. |

### Owner decisions (2026-11-25)

| # | Decision | Status |
| :- | :--- | :--- |
| D1 | **Drop BYOK entirely.** Remove the key UI, key storage and sync, `EncryptionService` and the key tests. | Decided |
| D2 | **Gemini Developer API** (Spark free tier) to start. | Decided (as recommended) |
| D3 | **Signed-in users plus anonymous guests** may call the AI. Every call is tied to a Firebase uid. | Decided |
| D4 | About **20 requests/min per user**, limited-use App Check tokens, and a budget alert. The owner configures these in the console. | Decided (as recommended) |
| D5 | Persona temperature | **Open**: settled by the spike (§6) |
| D6 | Per-agent and per-user model pickers, with the approved list and token limits from Remote Config plus a static fallback | Decided (as recommended) |
| D7 | Delete stored `geminiApiKey*` locally and in Firestore on first run | Decided (as recommended) |
| D8 | Playwright mocks of the proxy, plus a small `@live` smoke suite on a dev project | Decided (as recommended) |

**Sequencing:** the owner has not done the console setup yet. The docs phases (Mary → Jason → Watson/`/align`) run first; the spike runs once the console setup exists. `/batch` is not used for this migration.

## 5. Target architecture (Watson draft)

- **`AiService`**: a new injectable that is the **only** place `firebase/ai` is imported. It owns model creation (cached per model and system instruction), `generate`, `count`, error mapping to the ORCH-004 failure codes, and usage metadata for OPER metrics.
- **Extract orchestration first.** `callGemini` and its retry/backoff move out of `TachikomaChatComponent` (a 103-edge god node in the knowledge graph) behind `AiService`. This pays down the "orchestration embedded in the component" debt noted in PRD ORCH, and gives one seam to swap the SDK behind.
- **App Check** is initialised in `app.config.ts` before `getAI`, with the reCAPTCHA Enterprise provider and a debug token in `environment.local.ts`.
- **Model metadata:** `model-catalog.ts` (static limits) overridden by Remote Config `model_catalog` / `model_name`.
- **Status bar (OPER-007):** RPM/TPM now reflect the app-side per-user budget, not the user's own Gemini plan. Drop the tier selector.
- **Data:** remove `geminiApiKey*` from `UserProfile` (DAT-302 schema version bump), plus a one-time cleanup.

## 6. Spike before the PRD/Architecture changes (Athena, about 1 session, throwaway branch)

1. `firebase/ai` with the @angular/fire `FirebaseApp` in Angular 20: init order with App Check.
2. A real call through a dev project with a debug token: `systemInstruction`, `countTokens`, `usageMetadata`, and a `429` path.
3. **Temperature:** which recommended models accept it, and what happens when it is sent (ignored or `400`). This settles D5.
4. The exact proxy host and request shape, for Playwright mocks (D8).
5. Read the unread doc pages listed in §2 and update this file.

## 7. Delivery through the cohort

| Phase | Who | Output |
| :--- | :--- | :--- |
| 1 | `/mary` | ProjectBrief v1.2: the cost model moves from users to the project (budget, per-user limits). The "BYOK privacy" positioning changes. |
| 2 | `/jason` | PRD v1.5: AUTH-002 superseded by a new story ("use AI without managing keys"); AGNT-002 changes per D5; OPER-001/OPER-007 change meaning (project budget); D3 guest access. |
| 3–4 | Watson / `/align` | Architecture v1.4 (§5); ADL-019 "Replace BYOK @google/genai with Firebase AI Logic"; ADL-020 "App Check + per-user quotas"; CONSTRAINTS.md AI-SDK and model baseline update; ADL-006 marked superseded. |
| 6 | Eunice | Remove the key UI from the header, profile and dialogs; quota and limit messaging in the status bar and failed-step card; wireframes updated. |
| 7 | Poe | Shards, dependency-ordered (draft below). |
| 8 | Quinn | Mock rework for the proxy; retire AUTH T010–T014; new AI-service unit tests; a `@live` smoke suite. |
| 9 | Athena | Implements the shards in order. |
| 10 | Quinn | `/gate` each shard. |

**Draft shard order (for Poe):**
1. Extract `AiService` behind an interface, still on `@google/genai`, with no behaviour change.
2. Model catalog plus Remote Config.
3. Firebase AI Logic adapter and App Check init.
4. Switch the chat call site.
5. Switch persona drafting and convert.
6. Error and quota mapping to ORCH-004 and OPER-007.
7. Remove the BYOK UI.
8. Remove the BYOK data path, `EncryptionService`, and the one-time key cleanup (D7).
9. E2E mock rework plus the live smoke suite.
10. Remove `@google/genai` from `package.json`.

Shards 1–2 are safe to do before D5 is settled.

**Owner console tasks (cannot be done from code):**
- Enable Firebase AI Logic and choose the provider (D2).
- Register a reCAPTCHA Enterprise key and App Check.
- Set the per-user quota and a budget alert (D4).
- Restrict the web API key.
- Create a dev project (or debug tokens) for the spike.

## 8. Risks

- **Persona behaviour shift (D5):** losing temperature may flatten agent voices. This is the main product risk; it needs an explicit decision and a before/after comparison.
- **Shared quota:** all users share one project's quota. A spike in use throttles everyone. Mitigate with per-user limits, budget alerts and clear messaging (ORCH-004 failed-step card).
- **Cost moves to the owner.** Under Blaze, usage is billed to the project.
- **Model churn:** several models retire in the next 2 months (see the models page). Remote Config plus stable names limits the impact.
- **Test coverage:** no emulator means mocks can drift from the real proxy. The `@live` smoke suite is the guard.
