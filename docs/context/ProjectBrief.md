# **ProjectBrief.md**

| Project Name | Stand Alone Chat (SAC) |
| :---- | :---- |
| **Author** | Mary (Strategic Analyst) |
| **Target Audience** | Software developers, AI hobbyists, technical consultants |
| **Status** | Draft |

## **Version History**

| Version | Date | Author | Summary of Changes |
| :---- | :---- | :---- | :---- |
| v1.2 | 2026-11-25 | Mary | Firebase AI Logic migration: BYOK replaced by zero-setup managed AI access (owner decisions D1–D8); cost guardrail on the Spark free tier; risks updated for the shared project quota and the loss of persona temperature; stale constraints corrected (Angular 20, CONSTRAINTS.md exists, cross-device sync shipped). |
| v1.1 | 2026-05-28 | Mary | Expanded KPIs, quantified pain, deepened features, clarified constraints, and added open questions. |
| v1.0 | 2026-05-28 | Mary | Initial draft capturing the core multi-agent personality framework. |

### **1\. Executive Summary**

Stand Alone Chat (SAC) is a browser-first multi-agent workspace for users who need structured debate, not single-response chat. It runs distinct personas in a controlled turn loop and produces a synthesis output with traceable reasoning fields.

SAC targets developers, AI hobbyists, and consultants who currently stitch together multi-tab workflows. The product value is faster high-quality synthesis with lower orchestration effort.

### **2\. Problem Statement**

Most AI chat remains single-agent and linear. Users needing multiple perspectives manually orchestrate tabs, role prompts, and copied context, causing inconsistency and rework.

Observed overhead is about 20 to 45 minutes per deep task, often adding 3 to 6 hours of weekly friction for frequent users. Quality also drops because conclusions are hard to audit across sessions.

Existing multi-agent stacks are often backend-heavy and slow to iterate. SAC closes this gap with a lightweight interface focused on control and speed.

### **3\. Target Audience & Personas**

* **Persona 1: Reuben (Technical Architect / Developer)**
  * **Role/Title:** AI solutions architect and hands-on engineer.
  * **Primary Goal:** Rapidly test multi-agent prompting and orchestration strategies.
  * **Key Frustration:** Heavy frameworks obscure control and reduce experiment speed.
  * **Technical Proficiency:** High.

* **Persona 2: Neo (Creative Technologist / Hobbyist)**
  * **Role/Title:** Independent maker exploring AI personality systems.
  * **Primary Goal:** Keep distinct personalities stable in long sessions.
  * **Key Frustration:** Character drift and repetitive responses.
  * **Technical Proficiency:** Medium.

### **4\. Strategic Goals & Success Metrics**

* **Goal 1: Improve session depth and persona stability.**
  * *Metric:* Persona consistency score >= 85% at turn 40 in benchmark sessions.
  * *Baseline:* Approx. 55% to 65% by turn 15 in standard single-chat role prompts.

* **Goal 2: Reduce orchestration overhead for complex tasks.**
  * *Metric:* Median time-to-first-usable synthesis <= 8 minutes.
  * *Baseline:* 20 to 45 minutes using manual multi-tab workflows.

* **Goal 3: Maintain interactive performance under load.**
  * *Metric:* P95 per-agent response latency <= 2.0 seconds for 3-agent cycles.
  * *Baseline:* 4 to 6 seconds in comparable chained workflows.

* **Goal 4: Ensure output reliability for structured UI rendering.**
  * *Metric:* >= 99% schema-valid responses without UI-breaking parse failures.
  * *Baseline:* Approx. 85% to 92% strict-parse success in unconstrained free-text prompts.

* **Goal 5: Run at zero AI cost while the product proves itself (added v1.2).**
  * *Metric:* Monthly AI spend = $0. All Gemini usage stays within the Firebase **Spark plan free tier** (Gemini Developer API via Firebase AI Logic); no billing account is linked.
  * *Metric:* <= 5% of rounds per week end in a quota-throttled failed-step card (tracked from ORCH-004 failure codes for quota/429).
  * *Baseline:* New with the migration. Previously every user paid for their own key (BYOK), so the project had no AI cost and no shared quota.
  * *Note:* Throttling under heavy use is an accepted trade-off. Moving to Blaze (paid) is a later, explicit owner decision with its own spend ceiling.

### **5\. High-Level Feature Areas**

* **Agent Orchestration Engine:** Handles turn order, optional randomization, and synthesis in one loop. Includes timeout and duplicate-response protections.

* **Dual-Layer Conversation View:** Splits public dialogue from internal trace fields. Users can toggle trace visibility.

* **Schema and Validation Layer:** Enforces structured response contracts at the model boundary. Invalid payloads trigger safe fallback cards.

* **Session Memory Manager:** Applies sliding-window pruning and lightweight summaries in long threads. This keeps context quality stable.

* **Zero-Setup AI Access (replaces BYOK in v1.2):** AI works on first launch with no API key to find, paste or validate. Calls go through Firebase AI Logic, protected by App Check, with per-user rate limits. Signed-in users and anonymous guests can both use it, and every call is tied to a Firebase user. Quota exhaustion is shown clearly, never as a silent failure.

### **6\. Scope Definition**

* **In Scope (v1):**
  * Managed AI access through Firebase AI Logic for signed-in users and anonymous guests, with per-user limits and clear quota messaging (v1.2; replaces the client-side BYOK flow).
  * Three core personas with configurable prompts and deterministic orchestration.
  * Structured outputs with schema validation and fallback rendering behavior.
  * Internal reasoning visibility toggles for advanced users.

* **Out of Scope (v1):**
  * Multi-user collaboration, organization workspaces, and role-based access controls.
  * Bring-your-own Gemini API key (removed in v1.2: Firebase AI Logic has no supported BYOK path, and keeping both would mean two AI stacks to build and test).
  * Paid AI tier or linking a billing account (Blaze). This is a later, explicit owner decision.
  * _Correction (v1.2): accounts and cross-device sync were listed here in v1.1 but have since shipped (AUTH, SYNC modules)._
  * Retrieval-augmented generation, vector databases, and document ingestion pipelines.
  * Voice, avatar streaming, and multimodal real-time interactions.

### **7\. Technical Constraints & Stack Alignment**

* **Angular-first architecture:** Align with the existing Angular 20 codebase and standalone component pattern in this repository. New SAC capabilities should be introduced as modular page/service additions, avoiding parallel frameworks.

* **State and persistence alignment:** The broader project follows a local-first plus optional cloud-sync approach. SAC v1 should not block future alignment.

* **AI provider (v1.2):** Gemini through **Firebase AI Logic** (`firebase/ai`, Gemini Developer API backend), replacing direct `@google/genai` calls with user keys. Model names must stay configurable (Remote Config) because models retire frequently, and preview or `-latest` aliases are avoided in production. App Check (reCAPTCHA Enterprise) is mandatory for AI calls. Plan: `docs/context/MIGRATION_FIREBASE_AI_LOGIC.md`.

* **Constraints traceability:** `docs/context/CONSTRAINTS.md` exists (v1.2) and takes precedence over this brief. Watson updates its AI-SDK and model-baseline rules as part of the migration (ADL entries).

### **8\. Risks & Open Questions**

* **Risk 1: Shared project quota during multi-agent bursts (revised v1.2)**
  * *Description:* All users now share one Firebase project's free-tier quota. One round makes several calls, so a few active users can exhaust it and throttle everyone.
  * *Likelihood:* High | *Impact:* High
  * *Mitigation:* Per-user rate limit (~20 requests/min), adaptive pacing and retry budget, explicit quota messaging in the failed-step card, and the Goal 5 throttling metric. Blaze stays an owner decision.

* **Risk 2: Structured output failures in edge prompts**
  * *Description:* Malformed payloads can cascade into UI render faults or silent data loss.
  * *Likelihood:* Medium | *Impact:* High
  * *Mitigation:* Strict validator, safe fallback cards, and event logging for malformed responses.

* **Risk 3: Persona drift in long sessions**
  * *Description:* Agents may converge to similar tone/logic after long exchanges. **v1.2:** current Gemini models served through Firebase AI Logic do not accept per-agent temperature, which today helps keep personas distinct, so this risk rises.
  * *Likelihood:* Medium (High if temperature is lost) | *Impact:* Medium
  * *Mitigation:* Persona reinforcement checkpoints and drift scoring with alert thresholds. A migration spike (decision D5) checks temperature support before the PRD changes persona configuration.

* **Risk 4: Abuse of a keyless, guest-accessible AI endpoint (added v1.2)**
  * *Description:* Without user keys, the app's own quota is the target. Scripted clients or abusive guests could drain it.
  * *Likelihood:* Medium | *Impact:* High
  * *Mitigation:* App Check enforcement with limited-use tokens (replay protection), per-user limits tied to a Firebase uid, and restricting the web API key to the app's domain and the required APIs.

* **Open Questions:**
  * Which single provider/model combination is the default for launch benchmarking?
  * What prompt and data handling is acceptable now that AI calls go through a managed Firebase proxy rather than the user's own key? (Reframed in v1.2.)
  * Should guests get a lower per-user limit than signed-in users once usage data exists?

### **9\. Timeline & Milestones**

* **Phase 1: MVP Foundation (4-6 weeks)**
  * Deliverable 1.1: Core 3-agent orchestration loop with deterministic sequencing.
  * Deliverable 1.2: Structured response validation with safe fallback rendering.
  * Deliverable 1.3: SAC interface with dual-layer conversation panels and BYOK diagnostics.

* **Phase 2: Quality and Observability (3-4 weeks)**
  * Deliverable 2.1: Sliding-window memory manager and summary insertion logic.
  * Deliverable 2.2: Latency and schema-quality telemetry dashboard.
  * Deliverable 2.3: Persona drift scoring and beta pass/fail readiness criteria.

* **Phase 3: Firebase AI Logic Migration (added v1.2)**
  * Deliverable 3.1: `AiService` extracted as the single AI boundary, with the model catalog served from Remote Config.
  * Deliverable 3.2: Firebase AI Logic adapter with App Check; chat, persona drafting and conversion switched over.
  * Deliverable 3.3: BYOK removed (UI, storage, encryption, tests) and stored keys deleted on first run.
  * Deliverable 3.4: Quota and limit messaging, the throttling metric (Goal 5), and E2E proxy mocks plus a live smoke suite.
