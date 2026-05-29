# CanonicalDataModelSpec.md

| Version | Status | Date | Owner |
| :---- | :---- | :---- | :---- |
| 1.2 | Draft | 2026-05-29 | Watson (Architect) |

## 1. Purpose

This document is the canonical data model specification for SAC. It reflects the live TypeScript model layer as the source of truth and defines the normalized shapes that services must preserve when reading from or writing to localStorage and Firestore.

The model contract here is subordinate to [CONSTRAINTS.md](CONSTRAINTS.md). When a shape, default, or persistence behavior is unclear, the constraints file establishes the governing rule set.

## 2. Canonical Rules

1. The TypeScript model files under `src/app/models` are the authoritative schema source.
2. Persistence services must normalize incoming data into these model shapes.
3. Cloud writes must omit `undefined` values and preserve `null` where intentional.
4. Timestamps use Unix epoch milliseconds.
5. Firestore documents are user-scoped and must be isolated by authenticated user id.
6. Syncable entities preserve both `createdAt` and `updatedAt` whenever the record exists outside local memory.
7. SAC Firestore documents are stored in a dedicated Firestore database and use root user-scoped collection paths.

## 3. Interfaces and Classes

### SyncableData

```typescript
interface SyncableData {
  id: string;
  updatedAt: number;
  [key: string]: any;
}
```

Required for all syncable entities. In practice, all persisted models in the app also carry `createdAt` even though the base interface does not require it.

### UserProfile

```typescript
type GeminiModel = 'gemini-3.5-flash' | 'gemini-3.1';

interface UserProfile extends SyncableData {
  id: string;
  email: string;
  displayName: string;
  chatUsername: string;
  photoURL: string | null;
  geminiApiKey?: string;
  geminiApiKeyEncrypted?: string;
  geminiModel?: GeminiModel;
  rateLimitRPM?: number;
  createdAt: number;
  updatedAt: number;
}
```

Normalization defaults:

- `displayName = ''`
- `chatUsername = 'USER'`
- `photoURL = null`
- `geminiApiKey = ''`
- `geminiModel = 'gemini-3.5-flash'`
- `rateLimitRPM = 15`

### AgentProfile

```typescript
type AgentRole = 'chatter' | 'moderator';
type SilenceProtocol = 'standard' | 'always_speak' | 'conservative' | 'agreeable';
type SystemMode = 'form' | 'xml' | 'plaintext';

interface SystemFields {
  role: string;
  personality: string[];
  instructions: string[];
  constraints?: string[];
  outputFormat?: string;
  tone?: string;
  sampleDialogue?: { user: string; assistant: string }[];
}

interface AgentProfile extends SyncableData {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  systemMode?: SystemMode;
  systemFields?: SystemFields;
  role: AgentRole;
  model?: string;
  silenceProtocol?: SilenceProtocol;
  status?: 'idle' | 'thinking';
  createdAt: number;
  updatedAt: number;
}
```

Normalization defaults:

- `model = 'gemini-3.5-flash'`
- `model` fallback = `'gemini-3.1'` when quota or policy requires fallback
- `silenceProtocol = 'standard'`
- `status = 'idle'`
- `systemMode = 'plaintext'`

### ChatMessage

```typescript
interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  html: string;
  isUser: boolean;
  agentId?: string;
  timestamp: number;
  roundId?: number;
  status?: 'ok' | 'failed';
  failureCode?: string;
  failureMessage?: string;
}
```

Important notes:

- `html` is markdown-rendered from `text`.
- `roundId` is part of the live chat component contract and should be treated as a real data field even if some older docs omit it.
- Failed persona steps should be represented in transcript data with `status='failed'` and a user-visible failure message.

### ChatSession

```typescript
interface ChatSession extends SyncableData {
  id: string;
  title: string;
  description?: string;
  messages: ChatMessage[];
  conversationSummary: string;
  participatingAgents: AgentProfile[];
  createdAt: number;
  updatedAt: number;
}
```

Normalization defaults:

- `description = ''`
- `messages = []`
- `conversationSummary = ''`
- `participatingAgents = []`

### ChatSessionModel

Factory / normalization contract:

- `normalize(session)`
- `fromFirestore(data)`
- `fromLocalStorage(data)`
- `create(title?, participatingAgents?, description?)`
- `getSizeInKB(session)`
- `exceedsFirestoreLimit(session)`

### ChatMessageModel

Factory / normalization contract:

- `create({ sender, text, html, isUser, agentId? })`
- `normalize(message)`
- `isChatMessage(obj)`

## 4. Storage and Document Shapes

### localStorage keys observed in code

- `tachikoma_chat_sessions`
- `tachikoma_current_chat_id`
- `tachikoma_agent_profiles`
- `tachikoma_user_profile`
- `gemini_api_key`

### Firestore collections observed in code

- `users/{userId}/chat_sessions/{chatId}`
- `users/{userId}/agent_profiles/{agentId}`
- `users/{userId}/user_profile/{userId}`

### Firestore normalization rule

Write-time sanitization must recursively remove `undefined` fields. Read-time normalization must fill missing values with model defaults before the data is used by the UI.

## 5. Field-Level Notes

- `participatingAgents` is a snapshot of the agents used in the chat and should not be treated as a live pointer to global agent profiles.
- `conversationSummary` exists as a first-class field even though summary generation is a current-state gap or partial feature depending on the path.
- `geminiApiKeyEncrypted` is the cloud-only secret storage field; plaintext `geminiApiKey` is used locally.
- The code currently tracks `status` on agent profiles and should preserve that field when persisted.
- The default model family and any future model substitutions must remain compatible with [CONSTRAINTS.md §2](CONSTRAINTS.md#2-core-platform-constraints).
- Firestore path construction must resolve to `/users/{userId}/...` within the SAC-dedicated Firestore database.
