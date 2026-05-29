# Multimodal Attachment Storage Draft

| Version | Status | Date | Owner |
| :---- | :---- | :---- | :---- |
| 0.1 | Draft | 2026-05-29 | Watson (Architect) |

## 1. Purpose

Define a future-ready approach for attaching user files (documents and images) to chats and referencing them during Gemini calls.

This is a draft design note for later implementation and does not change current runtime behavior.

## 2. Scope

In scope:
- Upload and store user-owned files in Firebase Storage.
- Persist attachment metadata and chat linkage in Firestore.
- Build context payloads from selected attachments for Gemini requests.
- Support local emulator behavior for attachment flows.

Out of scope:
- Real-time multimodal streaming sessions.
- External vector database integration.
- Enterprise file governance and DLP policy features.

## 3. Key Design Decisions (Draft)

1. Storage of raw assets:
- Use Firebase Storage as the binary source of truth.

2. Storage of references:
- Use Firestore for per-user attachment metadata and chat-to-attachment linkage.

3. Gemini integration strategy:
- Use inline bytes for small assets and one-off references.
- Use Gemini Files API references for larger assets or repeated reuse.

4. Security boundary:
- Keep per-user isolation in Storage rules and Firestore rules.
- Never persist plaintext secrets in cloud metadata.

## 4. Proposed Data Model (Draft)

Canonical collection paths inside SAC Firestore database:
- users/{userId}/chat_attachments/{attachmentId}
- users/{userId}/chat_sessions/{chatId}

Suggested attachment shape:

```ts
interface ChatAttachment {
  id: string;
  userId: string;
  chatId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string; // ex: users/{userId}/chat_attachments/{attachmentId}/original
  storageBucket: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  sourceType: 'image' | 'document' | 'text';
  geminiFileUri?: string; // optional cache when uploaded to Gemini Files API
  geminiFileId?: string;
  extractedText?: string; // optional derived text for doc/image OCR pipeline
  createdAt: number;
  updatedAt: number;
}
```

Suggested chat linkage in chat session:

```ts
interface ChatSessionAttachmentRef {
  attachmentId: string;
  includeInContext: boolean;
  addedAt: number;
}
```

## 5. Request Assembly Strategy (Draft)

For each user turn:
1. Resolve attachment refs marked includeInContext.
2. Apply budget policy (count, size, mime constraints).
3. Prefer Gemini file references when available.
4. Fallback to inline bytes for small items.
5. Add compact attachment summary to transcript context.

Recommended guardrails:
- Max attachments per turn (for example 5).
- Max total attachment bytes per turn (policy-driven).
- Reject unsupported mime types early in UI.

## 6. Emulator Strategy

Use local emulators for integration testing:
- Auth emulator for user identity context.
- Firestore emulator for metadata documents.
- Storage emulator for binary upload/download paths.

Minimum local validation scenarios:
1. Upload image -> metadata doc created -> selectable as context.
2. Upload document -> metadata doc created -> selectable as context.
3. Unauthorized user cannot access other user attachment path.
4. Chat restore re-hydrates attachment references correctly.

## 7. Risks and Mitigations

1. Large file payloads increase latency/cost.
- Mitigation: strict size limits, optional Gemini file reuse cache.

2. MIME/type spoofing.
- Mitigation: validate MIME and extension in UI and server-side rules where possible.

3. Broken attachment references.
- Mitigation: reconcile missing Storage object vs Firestore metadata with periodic cleanup.

4. Prompt bloat from attachment text.
- Mitigation: summarize extracted text and include bounded snippets.

## 8. Implementation Phases (Draft)

Phase 1:
- Attachment metadata model + Storage upload + Firestore linkage.

Phase 2:
- Chat composer attachment picker + include/exclude toggle.

Phase 3:
- Gemini request assembly with inline bytes for images/docs.

Phase 4:
- Optional Gemini Files API caching for large/reused files.

## 9. Open Questions

1. Should extracted text be persisted or recomputed on demand?
2. Should chat attachments be immutable after message send?
3. What are final attachment size/type limits per plan tier?
4. Do we need attachment-level retention policies?
