# PRD.md

| Version | Status | Date | Owner |
| :---- | :---- | :---- | :---- |
| 1.3 | Draft | 2026-05-29 | Jason (PM) |

## 1. Executive Summary

Stand Alone Chat (SAC) is a browser-first multi-agent workspace built on Tachikoma Console. Users assemble AI personas, run structured round-robin conversations, inspect differing viewpoints, and preserve outputs as reusable sessions. The North Star is to reduce the manual overhead of multi-tab prompt orchestration while preserving transparency, persona consistency, and long-session utility.

This PRD is reconstruction-oriented. The app already contains meaningful shipped capability across authentication, persistence, agent management, synchronized storage, token tracking, and orchestration. The goal is to convert those capabilities and near-term gaps into a usable product definition that matches the current architecture and constraints.

Version 1.3 is the immediate baseline and must be treated as active product scope.

The primary success hypothesis is that users will prefer SAC over ad hoc multi-chat workflows if the product combines configurable agent teams, reliable session continuity, and guardrails.

This PRD is subordinate to [CONSTRAINTS.md](CONSTRAINTS.md) and [Architecture.md](Architecture.md). If a feature request conflicts with those documents, the higher-priority guardrails win.

## 2. Target Users & Personas

**Reuben, Technical Architect / Developer** uses SAC to test structured reasoning across specialized personas without losing low-level control over prompts, models, and session context.

**Neo, Creative Technologist / Hobbyist** uses SAC to sustain differentiated persona behavior over long conversations without building a backend-heavy orchestration stack.

**Priya, Technical Consultant / Strategist** is an operational persona inferred from the existing product. She uses SAC to produce defensible, exportable outputs for client work.

## 3. Feature Modules

Detailed user stories, acceptance criteria, priorities, and test IDs are maintained under `docs/stories/[PREFIX]/` to keep this PRD within budget while preserving traceability.

### AUTH - Identity, Access, and Secure Configuration

This module governs entry, account persistence, and safe storage of operational settings. It matters because SAC already behaves like a durable workspace rather than a stateless demo.

Current baseline: authentication, anonymous mode, encrypted cloud key storage, and first-login sync already exist. The product assumption is that local-first state remains available even when cloud sync is unavailable.

Stories:

- AUTH-001 Sign In And Resume
- AUTH-002 Save API Credentials Safely
- AUTH-003 Choose First-Login Sync Strategy

### AGNT - Agent Profiles and Instruction Design

This module defines how users create, edit, and govern personas. It matters because configuration depth is one of SAC's strongest differentiators.

Current baseline: profile CRUD, default agents, model assignment, tri-mode instruction editing, and AI-assisted basic persona drafting are in scope. The product must continue to treat the model layer as canonical and preserve historical chat snapshots when profiles change.

Stories:

- AGNT-001 Create And Edit Agent Profiles
- AGNT-002 Configure Role, Model, And Silence Behavior
- AGNT-003 Author Structured System Instructions
- AGNT-004 Draft Persona From Intent

### CHAT - Chat Session Lifecycle and Workspace Organization

This module covers how users start, label, continue, delete, and export conversations. It matters because SAC's value depends on sessions behaving like durable work artifacts.

Current baseline: new chat creation, metadata, agent selection, history, resume, delete, and export already exist. Chat sessions are product artifacts, not transient message buffers, and must remain recoverable across refreshes and devices when authenticated.

Stories:

- CHAT-001 Start A New Chat With Context
- CHAT-002 Resume And Manage Saved Chats
- CHAT-003 Export Conversation Records

### ORCH - Multi-Agent Conversation Protocol

This module is the core operating model of SAC. It handles round-robin execution, ordering, synthesis, shared context, and silence behavior.

Current baseline: protocol execution, randomized chatter order, silence filtering, moderator-last behavior, and processing feedback are already built. In v1.3, layered context budgeting and mandatory failed-persona-step UX are also required. The current architecture embeds orchestration inside `TachikomaChatComponent`, so the PRD should treat service extraction as a delivery dependency rather than an assumed completed layer.

Stories:

- ORCH-001 Run Round-Robin Agent Cycles
- ORCH-002 Apply Silence And Synthesis Rules
- ORCH-003 Share Chat And File Context Across Agents
- ORCH-004 Handle Failed Persona Steps Explicitly

### SYNC - Persistence, Offline Continuity, and Cross-Device Recovery

This module governs the two-stage persistence model: instant local writes with asynchronous cloud sync. It matters because users will treat data loss or sync ambiguity as product failures.

Current baseline: localStorage-first persistence, Firestore backup, encryption hooks, sync dialog, timestamps, and offline-friendly behavior exist. The product requirement is local-first continuity with cloud sync as a forward-only enhancement for authenticated users.

SAC cloud data paths are namespaced under `/apps/sac` to prevent collisions with other apps sharing the same Firebase project.

Stories:

- SYNC-001 Save Locally Before Cloud Sync
- SYNC-002 Restore Data Across Devices
- SYNC-003 Support Offline-First Operation
- SYNC-004 Use Firestore App Namespace

### OPER - Operational Guardrails, Quotas, and Quality Signals

This module covers token consumption, throttling, quota handling, and product telemetry. It matters because multi-agent systems amplify cost, latency, and failure visibility requirements.

Current baseline: token counting logic, rolling request metrics, rate-limit controls, retry behavior, and export-friendly session data exist. Operational telemetry is user-facing only where it supports safe and understandable chat execution.

Stories:

- OPER-001 Track Token Usage During Sessions
- OPER-002 Handle Quota And Throttle Failures Clearly
- OPER-003 Capture Quality And Performance Signals

## 4. User Journey Map

1. Landing and authentication: the user signs in, continues anonymously, or resumes.
2. Configuration check: the user confirms or enters an API key and selected model.
3. Persona setup: the user drafts a persona from intent and optionally edits it in advanced mode.
4. New chat setup: the user creates a chat, selects agents, and optionally adds a title and description.
5. Context enrichment: the user can upload text files or add descriptive context.
6. Protocol execution: the user submits a prompt and watches the cycle, including explicit failed-persona-step states when retries are exhausted.
7. Session management: the user continues the discussion, monitors usage constraints, edits metadata, or switches chats.
8. Persistence and recovery: the user refreshes, returns later, or changes devices.
9. Output reuse: the user exports a conversation artifact.

## 5. Non-Functional Requirements (NFRs)

Performance: Primary chat and profile routes must target LCP <= 2.5s on broadband desktop and <= 3.5s on mid-range mobile for authenticated repeat visits. A standard 3-agent response cycle should keep P95 per-agent latency <= 2.0s excluding upstream provider outages.

Security: Authentication uses Firebase-backed identity with per-user data isolation in Firestore. Cloud-stored API keys must be encrypted with user-scoped encryption before write, and no plaintext key may be written to Firestore.

Accessibility: All new SAC workflows must meet WCAG 2.1 AA for keyboard navigation, focus visibility, semantic labels, contrast, and status/error announcement.

Offline/PWA support: Existing local chats, profiles, and settings must remain available when offline. Local changes made offline must queue for later synchronization when authentication and network conditions allow.

Scalability: The product must support at least 1,000 stored chat sessions per user and 100 agent profiles per user without making core lists unusable. Cloud sync should remain incremental and timestamp-based where avoidable, with SAC records namespaced under `/apps/sac`.

## 6. Out of Scope

- Real-time collaborative editing or shared multi-user workspaces.
- Retrieval-augmented document search, vector stores, or external knowledge indexing.
- Audio/voice interaction, avatar streaming, or multimodal live sessions.
- Full enterprise policy administration, RBAC, or organization tenancy.
- Broad provider marketplace support beyond the current Gemini-centered implementation.
- Team preset sharing marketplace or public persona exchange.

## 7. Open Questions & Dependencies

1. Should conversation summarization return as an explicit feature, given the current app mostly relies on sliding context? Owner: Product.
2. How much token/quota visibility should be surfaced in the UI versus retained as internal diagnostics? Owner: Product + Design.
3. What is the approved analytics boundary for collecting session quality signals while honoring BYOK privacy expectations? Owner: Product + QA.
4. Should the default Gemini model be locked to the current constraint baseline unless Architecture and Constraints are updated together? Owner: Product + Architecture.
5. Should AI-assisted persona drafting use only the default model policy or allow per-user draft-model override in v1.3? Owner: Product + Architecture.

## 8. Success Metrics

- Time-to-first-usable synthesis <= 8 minutes for new task sessions. Tracking: Firebase Analytics events for chat_created, first_prompt_submitted, and first_synthesis_rendered.
- Persona consistency >= 85% at turn 40 in benchmark conversations. Tracking: curated QA benchmark runs recorded in Firestore or test artifacts with Quinn-owned rubric scoring.
- P95 per-agent latency <= 2.0s in standard 3-agent cycles. Tracking: client-side latency events aggregated through Analytics and optionally mirrored to Firestore aggregates.
- Structured response validity >= 99% for protocol-rendered outputs. Tracking: protocol-level validation counters stored as aggregate telemetry without raw secret payloads.
- Day-30 return rate >= 35% for activated authenticated users. Tracking: Firebase Analytics cohort retention using login and chat engagement events.
