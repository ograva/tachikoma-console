# Token Counter Feature

## Overview
Comprehensive token tracking and visualization system for the Tachikoma chat interface. Provides real-time token usage monitoring to help manage context windows and prevent hitting limits.

## Features

### 1. Real-time Token Counting
- Uses Gemini's `countTokens()` API for accurate pre-request token calculation
- Tracks input tokens (prompt + system instruction) before each API call
- Tracks output tokens (response) from API metadata
- Per-message and per-chat session totals

### 2. Visual Token Meter
- Progress bar showing token usage relative to context window (1M tokens)
- Color-coded warnings:
  - **Green**: Normal usage (< 80%)
  - **Yellow**: Warning zone (80-95%)
  - **Red (pulsing)**: Danger zone (> 95%)
- Displays formatted token counts (e.g., "125.5K / 1.0M tokens")
- Responsive design for mobile and desktop

### 3. Console Logging
- Input tokens logged before each request
- Output tokens logged after each response
- Running total displayed in complexity analysis
- Warnings when approaching context window limit

### 4. Automatic Resets
- Token metrics reset when loading a new chat
- Per-message counters reset at start of each user input
- Chat-level totals persist throughout conversation

## Technical Implementation

### Token Metrics Structure
```typescript
tokenMetrics = signal({
  inputTokensThisMessage: 0,    // Resets per user message
  outputTokensThisMessage: 0,   // Resets per user message
  totalTokensThisChat: 0,       // Accumulates throughout chat
  estimatedCost: 0,             // Future: cost tracking
});
```

### Constants
```typescript
readonly CONTEXT_WINDOW_LIMIT = 1048576; // Gemini 2.0 Flash context window (1M tokens)
readonly TOKEN_WARNING_THRESHOLD = 0.8;  // Warn at 80% of context window
```

### Context Window Limits
- **Gemini 2.0 Flash**: 1,048,576 tokens (1M)
- **Warning threshold**: 80% (838,860 tokens)
- **Danger threshold**: 95% (996,147 tokens)

### Key Methods

#### `formatTokenCount(tokens: number): string`
Formats token counts for display:
- `1,048,576` → `"1.0M"`
- `125,500` → `"125.5K"`
- `500` → `"500"`

#### Token Counting in `callGemini()`
```typescript
// Count input tokens before sending
const tokenCount = await ai.models.countTokens({
  model: this.selectedModel,
  contents: prompt,
  config: { systemInstruction: systemInstruction },
});

const inputTokens = tokenCount.totalTokens || 0;
this.tokenMetrics.update((m) => ({
  ...m,
  inputTokensThisMessage: m.inputTokensThisMessage + inputTokens,
  totalTokensThisChat: m.totalTokensThisChat + inputTokens,
}));

// Track output tokens from response
if (response.usageMetadata) {
  const outputTokens = response.usageMetadata.candidatesTokenCount || 0;
  this.tokenMetrics.update((m) => ({
    ...m,
    outputTokensThisMessage: m.outputTokensThisMessage + outputTokens,
    totalTokensThisChat: m.totalTokensThisChat + outputTokens,
  }));
}
```

#### Reset Logic
```typescript
// In triggerProtocol() - reset per-message counters
this.tokenMetrics.update((m) => ({
  ...m,
  inputTokensThisMessage: 0,
  outputTokensThisMessage: 0,
}));

// In loadCurrentChat() - reset all counters for new chat
this.tokenMetrics.set({
  inputTokensThisMessage: 0,
  outputTokensThisMessage: 0,
  totalTokensThisChat: 0,
  estimatedCost: 0,
});
```

## UI Implementation

### HTML Template
Located in header section of `tachikoma-chat.component.html`:

```html
<!-- Token Meter -->
<div class="token-meter" *ngIf="tokenMetrics().totalTokensThisChat > 0">
    <div class="token-bar-container">
        <div class="token-bar" 
             [style.width.%]="(tokenMetrics().totalTokensThisChat / CONTEXT_WINDOW_LIMIT) * 100"
             [class.token-warning]="tokenMetrics().totalTokensThisChat > CONTEXT_WINDOW_LIMIT * TOKEN_WARNING_THRESHOLD"
             [class.token-danger]="tokenMetrics().totalTokensThisChat > CONTEXT_WINDOW_LIMIT * 0.95">
        </div>
    </div>
    <div class="token-info">
        <span class="token-count">{{ formatTokenCount(tokenMetrics().totalTokensThisChat) }}</span>
        <span class="token-limit">/ {{ formatTokenCount(CONTEXT_WINDOW_LIMIT) }} tokens</span>
    </div>
</div>
```

### SCSS Styling
Located in `tachikoma-chat.component.scss`:

```scss
/* Token Meter */
.token-meter {
    margin-top: 0.5rem;
    
    @media (max-width: 767px) {
        margin-top: 0.25rem;
    }
}

.token-bar-container {
    width: 200px;
    height: 4px;
    background: rgba(107, 114, 128, 0.3);
    border-radius: 2px;
    overflow: hidden;
    border: 1px solid rgba(0, 255, 65, 0.2);
    
    @media (max-width: 767px) {
        width: 150px;
        height: 3px;
    }
}

.token-bar {
    height: 100%;
    background: var(--neon-green);
    transition: width 0.3s ease, background-color 0.3s ease;
    box-shadow: 0 0 8px rgba(0, 255, 65, 0.6);
    
    &.token-warning {
        background: #fbbf24;
        box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
    }
    
    &.token-danger {
        background: var(--neon-pink);
        box-shadow: 0 0 8px rgba(255, 0, 222, 0.6);
        animation: tokenPulse 1s ease-in-out infinite;
    }
}

@keyframes tokenPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.token-info {
    display: flex;
    gap: 0.25rem;
    margin-top: 0.25rem;
    font-size: 0.625rem;
    font-family: 'JetBrains Mono', monospace;
    
    .token-count {
        color: var(--neon-green);
        font-weight: bold;
    }
    
    .token-limit {
        color: #6b7280;
    }
    
    @media (max-width: 767px) {
        font-size: 0.5rem;
    }
}
```

## Console Output Examples

### Normal Operation
```
📝 Input tokens: 1,245 | Total this chat: 15,892
📤 Output tokens: 892 | Total response: 3,421 chars
```

### Warning Threshold
```
📝 Input tokens: 2,150 | Total this chat: 875,432
⚠️ WARNING: Approaching context window limit (875,432/1,048,576 tokens)
📤 Output tokens: 1,203 | Total response: 4,892 chars
```

## Use Cases

### 1. Visibility
Monitor exactly how many tokens are being consumed in real-time, helping users understand the cost and impact of their conversations.

### 2. Prevention
Receive warnings before hitting context window limits, allowing users to start a new chat or summarize the conversation before losing context.

### 3. Optimization
Identify which prompts/conversations are token-heavy, enabling better prompt engineering and conversation management.

### 4. Cost Tracking
Foundation for future cost estimation features based on token usage and model pricing.

## Best Practices

### For Users
1. **Monitor the meter**: Keep an eye on the token bar color
2. **Yellow warning**: Consider summarizing or starting a new chat soon
3. **Red danger**: Start a new chat immediately to avoid context loss
4. **Long conversations**: Use chat summaries to condense history

### For Developers
1. **Token counting is async**: Always await `countTokens()` before sending requests
2. **Error handling**: Wrap token counting in try-catch (failures are logged, not fatal)
3. **Reset timing**: Per-message resets happen in `triggerProtocol()`, per-chat resets in `loadCurrentChat()`
4. **UI updates**: Token metrics use Angular signals for automatic reactivity

## Future Enhancements

### Planned Features
1. **Cost estimation**: Calculate approximate cost based on token usage and model pricing
2. **Token history**: Chart showing token usage over time
3. **Per-agent breakdown**: Show which agents consume most tokens
4. **Auto-summarization**: Trigger summary generation when approaching limits
5. **Export token data**: Include token metrics in chat exports

### Potential Optimizations
1. **Prompt compression**: Automatically compress conversation history when approaching limits
2. **Smart context pruning**: Remove oldest messages while preserving important context
3. **Model switching**: Suggest switching to models with larger context windows
4. **Token budgeting**: Set per-chat token budgets with alerts

## Related Files
- **Component**: `src/app/pages/tachikoma-chat/tachikoma-chat.component.ts`
- **Template**: `src/app/pages/tachikoma-chat/tachikoma-chat.component.html`
- **Styles**: `src/app/pages/tachikoma-chat/tachikoma-chat.component.scss`
- **Rate Limiting**: See `RATE_LIMITING.md` for related quota management

## Version History
- **V3.2** (Dec 2025): Initial implementation with real-time tracking and visual meter
- Added alongside rate limiting improvements for comprehensive API management
