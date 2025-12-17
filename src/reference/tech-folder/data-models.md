# Tachikoma Console - Data Models

## Overview

This document describes all data models used in the Tachikoma Console application, including their structure, validation rules, and usage patterns.

## Core Interfaces

### SyncableData

Base interface for all cloud-syncable entities.

```typescript
interface SyncableData {
  id: string;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}
```

**Usage:**
- All models that sync to Firestore must implement this interface
- Timestamps are Unix epoch milliseconds (Date.now())
- Used by FirestoreService for automatic sync tracking

## Chat Models

### ChatSession

Represents a complete conversation session with agents.

```typescript
interface ChatSession extends SyncableData {
  id: string;                        // Unique identifier (UUID)
  title: string;                     // Chat title (default: timestamp-based)
  description?: string;              // Optional context for agents
  messages: ChatMessage[];           // All messages in conversation
  conversationSummary: string;       // Running summary of conversation
  participatingAgents: AgentProfile[]; // Agents used in this chat
  createdAt: number;                 // Session creation timestamp
  updatedAt: number;                 // Last modification timestamp
}
```

**Field Details:**

- **title**: 
  - Max length: 100 characters
  - Default: "Chat {timestamp}" format
  - User-editable via chat creation dialog
  - Displayed in chat history listing

- **description**:
  - Max length: 500 characters
  - Optional context shared with all agents
  - Prepended to conversation history when calling agents
  - Example: "We're discussing AI ethics" or "Help me debug React"

- **messages**:
  - Array of ChatMessage objects
  - Includes both user and agent messages
  - Ordered chronologically by timestamp

- **conversationSummary**:
  - Automatically generated every 6 message exchanges
  - Reduces token usage by condensing conversation history
  - Used as context for subsequent agent calls

- **participatingAgents**:
  - Snapshot of agent profiles at chat creation time
  - Preserves agent configurations even if profiles change later
  - Minimum 1 agent required

### ChatMessage

Individual message within a chat session.

```typescript
interface ChatMessage {
  id: string;          // Unique message identifier
  sender: string;      // Display name (user or agent name)
  text: string;        // Raw message text
  html: string;        // Markdown-parsed HTML for rendering
  isUser: boolean;     // True if from user, false if from agent
  agentId?: string;    // Agent identifier (optional, only for agent messages)
  timestamp: number;   // Message creation timestamp
}
```

**Field Details:**

- **html**: Generated via `marked` library from `text` field
- **agentId**: One of 'logikoma', 'ghost', 'moderator', or custom agent ID
- Used for both local display and cloud storage

### ChatSessionModel

Static factory methods for ChatSession normalization and creation.

```typescript
class ChatSessionModel {
  static readonly DEFAULTS = {
    description: '',
    messages: [] as ChatMessage[],
    conversationSummary: '',
    participatingAgents: [] as AgentProfile[],
  };

  static normalize(session: Partial<ChatSession>): ChatSession;
  static create(title?: string, agents?: AgentProfile[], description?: string): ChatSession;
  static generateDefaultTitle(): string;
}
```

**Methods:**

- **normalize()**: Ensures all optional fields have proper defaults when loading from storage
- **create()**: Factory method for new chat sessions with validation
- **generateDefaultTitle()**: Creates timestamp-based title like "Chat 12/17/2024 3:45 PM"

## Agent Models

### AgentProfile

Configuration for an AI agent persona.

```typescript
interface AgentProfile extends SyncableData {
  id: string;                        // Unique identifier
  name: string;                      // Display name
  color: string;                     // CSS color name (e.g., 'cyan')
  hex: string;                       // Hex color code (e.g., '#00f3ff')
  temp: number;                      // Temperature (0.0-1.0)
  system: string;                    // System prompt
  role: 'chatter' | 'moderator';     // Agent role in protocol
  silenceProtocol?: 'standard' | 'always_speak' | 'conservative' | 'agreeable';
  createdAt: number;
  updatedAt: number;
}
```

**Field Details:**

- **temperature (temp)**:
  - Range: 0.0 (deterministic) to 1.0 (creative)
  - LOGIKOMA: 0.2 (analytical)
  - GHOST-1: 0.9 (philosophical)
  - MODERATOR: 0.5 (balanced)

- **role**:
  - **chatter**: Participates in randomized order, subject to SILENCE PROTOCOL
  - **moderator**: Always speaks last, synthesizes responses

- **silenceProtocol**:
  - **standard**: Outputs "SILENCE" if previous agent covered the perspective
  - **always_speak**: Never silences, always provides response
  - **conservative**: More likely to silence (higher threshold)
  - **agreeable**: Tends to agree with previous agents

- **system**: Full system prompt defining agent behavior and personality

### AgentProfileModel

Static factory methods for AgentProfile creation and management.

```typescript
class AgentProfileModel {
  static readonly DEFAULTS = {
    silenceProtocol: 'standard' as const,
    temp: 0.5,
    role: 'chatter' as const,
  };

  static readonly DEFAULT_AGENTS: AgentProfile[];
  
  static normalize(profile: Partial<AgentProfile>): AgentProfile;
  static create(params: Partial<AgentProfile>): AgentProfile;
  static getDefaults(): AgentProfile[];
}
```

**Methods:**

- **DEFAULT_AGENTS**: Array of 3 built-in agents (LOGIKOMA, GHOST-1, MODERATOR)
- **normalize()**: Ensures optional fields have defaults
- **create()**: Factory with validation (requires name, system prompt)
- **getDefaults()**: Returns fresh copies of default agents

## User Models

### UserProfile

User settings and preferences.

```typescript
interface UserProfile extends SyncableData {
  id: string;                        // Firebase UID
  displayName: string;               // User's display name
  email?: string;                    // User's email (optional)
  photoURL?: string;                 // Profile picture URL
  geminiApiKey?: string;             // Encrypted API key (Firestore only)
  selectedModel: GeminiModel;        // Active AI model
  rateLimitRPM: number;              // Rate limit (requests per minute)
  isPaidTier: boolean;               // Premium subscription status
  createdAt: number;
  updatedAt: number;
}
```

**Field Details:**

- **geminiApiKey**:
  - Stored plain text in localStorage (browser-secured)
  - AES-256-GCM encrypted before Firestore upload
  - Decrypted on retrieval via EncryptionService

- **selectedModel**:
  - Type: 'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.5-flash'
  - Default: 'gemini-2.5-flash'

- **rateLimitRPM**:
  - Free tier: 15 RPM (default)
  - Paid tier: 1000 RPM
  - Used for request throttling in complexity tracking

- **isPaidTier**:
  - Default: false
  - Determines rate limits and feature access

### GeminiModel

Supported Google Gemini AI models.

```typescript
type GeminiModel = 
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.5-flash';
```

**Model Characteristics:**

- **2.0-flash-exp**: Latest experimental model, fastest
- **1.5-flash**: Stable, balanced speed/quality
- **1.5-pro**: Highest quality, slower
- **2.5-flash**: Current default, optimized balance

## Storage Patterns

### 2-Stage Persistence System

All data follows this pattern:

1. **Write Path**:
   - Save to localStorage (instant)
   - Async sync to Firestore (background)

2. **Read Path**:
   - Load from localStorage (instant display)
   - Background sync from Firestore (if authenticated)

### Normalization

Always use model `normalize()` methods when loading data:

```typescript
// ❌ BAD: Direct deserialization
const chat = JSON.parse(localStorage.getItem('chat'));

// ✅ GOOD: Normalized with defaults
const rawChat = JSON.parse(localStorage.getItem('chat'));
const chat = ChatSessionModel.normalize(rawChat);
```

### Timestamps

- All timestamps are Unix epoch milliseconds (Date.now())
- Always update `updatedAt` on any modification
- Set `createdAt` only on initial creation
- Used by sync logic to determine latest version

## Validation Rules

### Common Rules

- **id**: Must be unique, non-empty string (use UUID for new entities)
- **createdAt**: Must be positive number, set once on creation
- **updatedAt**: Must be >= createdAt, updated on every change

### ChatSession Specific

- **title**: Max 100 chars, defaults to timestamp if empty
- **description**: Max 500 chars, optional
- **messages**: Must be array (can be empty for new chats)
- **participatingAgents**: Must have at least 1 agent

### AgentProfile Specific

- **name**: Required, non-empty string
- **temp**: Number between 0.0 and 1.0
- **system**: Required, non-empty string (system prompt)
- **role**: Must be 'chatter' or 'moderator'
- **color/hex**: Must be valid CSS color values

### UserProfile Specific

- **displayName**: Required, non-empty string
- **rateLimitRPM**: Must be positive number
- **selectedModel**: Must be one of GeminiModel values

## File Locations

- **ChatSession**: `src/app/models/chat-session.model.ts`
- **ChatMessage**: `src/app/models/chat-message.model.ts`
- **AgentProfile**: `src/app/models/agent-profile.model.ts`
- **UserProfile**: `src/app/services/user-profile.service.ts` (interface only)
- **SyncableData**: `src/app/models/syncable-data.model.ts`

## Migration Notes

When adding new fields to existing models:

1. Add field with `?` (optional) to interface
2. Add default value in Model.DEFAULTS
3. Update normalize() method to apply default
4. Existing data will automatically get defaults on next load
5. No manual migration needed (handled by normalization)

## Best Practices

1. **Always normalize** data loaded from any source
2. **Use factory methods** (create, normalize) instead of manual construction
3. **Update timestamps** on every modification
4. **Encrypt sensitive data** before Firestore upload (API keys)
5. **Validate required fields** before saving
6. **Use TypeScript types** to catch errors at compile time
7. **Test offline mode** - all models must work without Firestore
