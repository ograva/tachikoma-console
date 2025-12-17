# Tachikoma Chat Features

## Overview

This document describes the key features of the Tachikoma Chat interface, including chat management, multi-agent protocol, complexity tracking, and API throttling.

## Chat Management Features

### Chat Title and Description

#### Chat Title

**Purpose**: User-friendly identification for saved conversations

**Implementation:**
- Input field in new chat dialog (max 100 characters)
- Optional - defaults to timestamp-based title if not provided
- Default format: "Chat 12/17/2024 3:45 PM"
- Displayed prominently in chat history drawer
- Editable via `updateChatTitle()` method in ChatStorageService

**User Experience:**
- Appears at top of new chat dialog
- Uses Material icon "title" for visual clarity
- Cyan neon styling matches app theme
- Character counter shows remaining space (X/100)
- Placeholder: "Give this chat a memorable title..."

**Code Location:**
- Model: `src/app/models/chat-session.model.ts`
- Component: `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts`
- Template: `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`

#### Chat Description (Context)

**Purpose**: Provide background context to all participating agents

**Implementation:**
- Textarea in new chat dialog (max 500 characters)
- Optional - chat works without description
- Prepended to conversation history when calling agents
- Format: `[CHAT CONTEXT: {description}]\n\n{conversation_history}`
- Stored in ChatSession.description field

**User Experience:**
- Appears below title in new chat dialog
- Uses Material icon "description"
- Multi-line textarea with resize capability
- Character counter shows remaining space (X/500)
- Placeholder: "Provide context for the agents..."
- Examples shown: "We're discussing AI ethics", "Help me debug React"

**Agent Integration:**
- All agents receive the description as context
- Helps agents understand conversation goal/topic
- Reduces need for user to re-explain context each message
- Particularly useful for technical discussions or specific domains

**Code Reference:**
```typescript
// Building conversation history with description
let conversationHistory = this.buildConversationHistory();
const chatDescription = this.currentChatDescription;
if (chatDescription) {
  conversationHistory = `[CHAT CONTEXT: ${chatDescription}]\n\n${conversationHistory}`;
}
```

### Chat History Management

**Features:**
- View all saved conversations in drawer (Material sidenav)
- Click any chat to switch to it (loads messages, summary, agents)
- Delete chats with confirmation
- Shows chat metadata:
  - Title (prominent display)
  - Last updated date/time
  - Message count
- Active chat highlighted with green border
- Empty state message when no chats exist

**Storage:**
- localStorage: Instant access for offline mode
- Firestore: Cloud backup for cross-device sync
- Automatic sync on any modification

**Code Location:**
- Service: `src/app/services/chat-storage.service.ts`
- Methods: `switchToChat()`, `deleteChat()`, `getChatSessions()`

## Multi-Agent Protocol

### Agent Selection

**Purpose**: User controls which agents participate in each chat

**Features:**
- Dialog shown when creating new chat
- All agents selected by default
- Toggle individual agents on/off
- "Select All" and "Clear All" quick actions
- Minimum 1 agent required to proceed
- Agent cards show:
  - Name with signature color
  - Role (CHATTER or MODERATOR)
  - Color badge indicator

**Agent Roles:**
- **Chatter**: Participates in randomized order, subject to SILENCE PROTOCOL
- **Moderator**: Always speaks last, synthesizes all responses

**Code Reference:**
```typescript
toggleAgentSelection(agentId: string): void {
  this.selectedAgentIds.update((ids) => {
    const newIds = new Set(ids);
    if (newIds.has(agentId)) {
      newIds.delete(agentId);
    } else {
      newIds.add(agentId);
    }
    return newIds;
  });
}
```

### Protocol Flow

1. **User Input**: User submits message via input field
2. **Randomization**: Chatter agents shuffled (prevents response bias)
3. **Sequential Processing**: Agents process in randomized order
4. **Context Sharing**: Each agent sees previous agent responses
5. **SILENCE PROTOCOL**: Agents can output "SILENCE" if previous agent covered their perspective
6. **Moderator Synthesis**: Moderator agent processes last, synthesizes all responses
7. **Display**: All non-SILENCE messages displayed in chat feed

**Visual Feedback:**
- Neural Activity Panel shows agent status during processing
- Desktop: Side panel (always visible)
- Mobile: Overlay section (appears during processing)
- Agent status: "IDLE" or "PROCESSING..."
- Color-coded progress bars for each agent

### SILENCE PROTOCOL

**Purpose**: Avoid redundant responses, improve conversation flow

**Modes:**
- **standard**: Output "SILENCE" if previous agent already covered the perspective
- **always_speak**: Never silence, always provide response (useful for moderators)
- **conservative**: Higher threshold for silencing (more likely to speak)
- **agreeable**: Tends to agree/build on previous agents

**Implementation:**
- Defined in agent system prompt
- Agents analyze previous responses before generating
- "SILENCE" outputs filtered from display
- Logged to console for debugging

**Code Reference:**
```typescript
if (response.trim().toUpperCase() === 'SILENCE') {
  console.log(`${agent.name}: SILENCE PROTOCOL activated`);
  continue; // Skip adding this message to chat feed
}
```

## Complexity Tracking

### O(n) Request Metrics

**Purpose**: Track API usage patterns, prevent abuse, optimize performance

**Metrics Tracked:**
```typescript
requestMetrics = {
  totalRequests: 0,           // Lifetime request count (all sessions)
  requestsThisSession: 0,     // Requests since page load
  averageResponseTime: 0,     // Rolling average in milliseconds
  lastRequestTime: 0,         // Timestamp of last request
  requestTimestamps: [],      // Array of timestamps in current window
  errorsThisSession: 0,       // Failed requests (network, API, validation)
  requestsPerMessage: 0,      // Average API calls per user message
};
```

**Constants:**
- `REQUEST_WINDOW_MS`: 60000 (1 minute rolling window)
- `MIN_REQUEST_INTERVAL_MS`: 1000 (minimum 1 second between requests)
- `SUMMARY_INTERVAL`: 6 (trigger summary every 6 message exchanges)

### Complexity Analysis

**Per-Message Analysis:**
Logged before each protocol trigger, provides insights into request patterns.

```typescript
logComplexityAnalysis(userMessage: string): void {
  const now = Date.now();
  
  // Calculate requests in current 1-minute window
  this.requestMetrics.requestTimestamps = this.requestMetrics.requestTimestamps
    .filter(ts => now - ts < this.REQUEST_WINDOW_MS);
  
  const requestsInWindow = this.requestMetrics.requestTimestamps.length;
  
  // Expected requests for this message (one per agent)
  const expectedRequests = this.agents.length;
  
  console.log('=== COMPLEXITY ANALYSIS ===');
  console.log(`User Message: "${userMessage}"`);
  console.log(`Expected API Calls: ${expectedRequests} (one per agent)`);
  console.log(`Requests in last minute: ${requestsInWindow}/${this.maxRequestsPerMinute}`);
  console.log(`Total Requests (all time): ${this.requestMetrics.totalRequests}`);
  console.log(`Requests this session: ${this.requestMetrics.requestsThisSession}`);
  console.log(`Average response time: ${this.requestMetrics.averageResponseTime.toFixed(2)}ms`);
  console.log(`Time since last request: ${now - this.requestMetrics.lastRequestTime}ms`);
  console.log(`Errors this session: ${this.requestMetrics.errorsThisSession}`);
  console.log('===========================');
}
```

**Logged Metrics:**
- User message preview
- Expected API calls (number of agents)
- Current window usage vs. rate limit
- Lifetime and session request counts
- Average response time (performance indicator)
- Time since last request (throttling gap)
- Error count (reliability indicator)

### Request Tracking

**On Each API Call:**
```typescript
// Record request timestamp
this.requestMetrics.requestTimestamps.push(Date.now());
this.requestMetrics.totalRequests++;
this.requestMetrics.requestsThisSession++;

// Measure response time
const startTime = performance.now();
const response = await callGemini(...);
const endTime = performance.now();
const responseTime = endTime - startTime;

// Update rolling average
const totalTime = this.requestMetrics.averageResponseTime * (this.requestMetrics.totalRequests - 1);
this.requestMetrics.averageResponseTime = (totalTime + responseTime) / this.requestMetrics.totalRequests;

// Update last request time
this.requestMetrics.lastRequestTime = Date.now();
```

### Optimization Benefits

1. **Rate Limit Awareness**: Prevents hitting API limits by tracking requests per minute
2. **Performance Monitoring**: Average response time helps identify slow requests
3. **Throttling**: Enforces minimum interval between requests
4. **Error Tracking**: Identifies reliability issues
5. **Cost Estimation**: Request counts help estimate API costs
6. **User Feedback**: Can warn users approaching rate limits

## API Throttling

### Rate Limits by Tier

**Free Tier:**
- Rate: 15 requests per minute (RPM)
- Default for all users
- Defined in `UserProfile.rateLimitRPM`

**Paid Tier:**
- Rate: 1000 RPM
- Set via `UserProfile.isPaidTier = true`
- Significantly higher throughput for premium users

### Throttling Implementation

**Request Window Tracking:**
```typescript
// Clean old timestamps outside current window
this.requestMetrics.requestTimestamps = this.requestMetrics.requestTimestamps
  .filter(ts => Date.now() - ts < this.REQUEST_WINDOW_MS);

// Check if at rate limit
const requestsInWindow = this.requestMetrics.requestTimestamps.length;
if (requestsInWindow >= this.maxRequestsPerMinute) {
  throw new Error(`Rate limit exceeded: ${this.maxRequestsPerMinute} RPM`);
}
```

**Minimum Interval Enforcement:**
```typescript
const timeSinceLastRequest = Date.now() - this.requestMetrics.lastRequestTime;
if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL_MS) {
  const waitTime = this.MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
  await new Promise(resolve => setTimeout(resolve, waitTime));
}
```

### Rate Limit Configuration

**User Profile Service:**
```typescript
get maxRequestsPerMinute(): number {
  return this.userProfileService.profile()?.rateLimitRPM || 15;
}
```

**Dynamic Adjustment:**
- Rate limit retrieved from user profile
- Changes take effect immediately (signal-based reactivity)
- Can be updated via Firebase/Firestore
- No app restart needed

### Error Handling

**Rate Limit Exceeded:**
```typescript
if (requestsInWindow >= this.maxRequestsPerMinute) {
  console.error(`⚠️ RATE LIMIT: ${requestsInWindow}/${this.maxRequestsPerMinute} RPM`);
  alert(`Rate limit reached. Please wait before sending more messages.`);
  return;
}
```

**API Key Validation:**
```typescript
const cleanKey = this.getCleanKey();
if (!cleanKey) {
  alert('PLEASE ENTER A VALID API KEY');
  return;
}
```

**Network Errors:**
```typescript
try {
  const response = await this.callGemini(...);
} catch (error) {
  console.error('API Error:', error);
  this.requestMetrics.errorsThisSession++;
  this.addMessage('SYSTEM', `Error: ${error.message}`, false);
}
```

## Conversation Summarization

**Purpose**: Reduce token usage by condensing conversation history

**Trigger:** Every 6 message exchanges (user + agent responses)

**Implementation:**
```typescript
if (this.messagesSinceLastSummary >= this.SUMMARY_INTERVAL) {
  conversationHistory = await this.summarizeConversation(conversationHistory);
  this.messagesSinceLastSummary = 0;
}
```

**Benefits:**
- Reduces API token costs
- Maintains context without full message history
- Prevents context window overflow on long conversations
- Improves response time (less text to process)

**Storage:**
- Summary stored in `ChatSession.conversationSummary`
- Counter stored in `messagesSinceLastSummary`
- Both persisted across page reloads

## File Upload Context

**Purpose**: Share file contents with all agents in conversation

**Supported Types:**
- Text files (.txt, .md)
- Code files (any text-based)
- Data files (.json, .csv, .xml, .log)
- Any file readable as text

**Features:**
- Multi-file upload via file input
- Files displayed in context bar above input
- Contents automatically included in agent prompts
- Shared with all participating agents
- Removable individually or clear all
- Loading spinner during file read

**Implementation:**
```typescript
// File content prepended to each agent prompt
const fileContext = this.uploadedFiles().map(f => 
  `[FILE: ${f.name}]\n${f.content}\n\n`
).join('');

const fullPrompt = fileContext + conversationContext;
```

**User Experience:**
- Paperclip icon button in footer
- File chips show name and type icon
- X button to remove individual files
- Clear all button when multiple files present
- Visual indicator (spinning sync icon) during upload

## Export Features

**Supported Formats:**
- Plain Text (.txt)
- PDF (.pdf) via jsPDF
- Word Document (.docx) via docx library

**Export Content:**
- Chat title and timestamp
- All messages (user and agent)
- Formatted with sender names
- Color-coded by agent (PDF only)

**User Experience:**
- Download icon in header
- Dropdown menu with format options
- Only shown when messages exist
- Immediate browser download

**Code Location:**
- Methods: `exportAsText()`, `exportAsPdf()`, `exportAsWord()`
- Libraries: jsPDF, docx, file-saver

## Code Locations

**Main Component:**
- `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts`
- `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`
- `src/app/pages/tachikoma-chat/tachikoma-chat.component.scss`

**Services:**
- `src/app/services/chat-storage.service.ts` (chat persistence)
- `src/app/services/agent-profile.service.ts` (agent management)
- `src/app/services/user-profile.service.ts` (rate limits, preferences)

**Models:**
- `src/app/models/chat-session.model.ts` (chat structure)
- `src/app/models/agent-profile.model.ts` (agent configuration)
- `src/app/models/chat-message.model.ts` (message structure)

## Performance Considerations

1. **Throttling prevents API abuse**: Rate limits enforced per tier
2. **Summarization reduces costs**: Auto-condense after 6 exchanges
3. **Local-first architecture**: localStorage for instant load
4. **Async cloud sync**: Non-blocking Firestore operations
5. **Request metrics track efficiency**: O(n) complexity analysis
6. **Signal-based reactivity**: Minimal re-renders, efficient updates
7. **Lazy loading**: Chat history loaded on demand (drawer open)
