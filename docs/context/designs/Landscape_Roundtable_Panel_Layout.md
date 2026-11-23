# Landscape Roundtable Panel Layout & Compact Status Bar
## UI/UX Design Contract & Technical Specification

**Authors:** Eunice (UI/UX Designer) & Watson (System Architect)  
**Version:** v1.0  
**Date:** 2026-06-18  
**Theme:** Stand Alone Complex (SAC) Cyberpunk / Tactical Workstation  

## Revision History

| Date | Author | Note |
| :--- | :--- | :--- |
| 2026-06-18 | Eunice & Watson | v1.0 forward specification (content below, unchanged). |
| 2026-11-23 | Eunice | Shipped. **The as-built reference is now [Wireframe_ChatRoundtable.md](Wireframe_ChatRoundtable.md)** (landscape body + status bar), with [Wireframe_Chat.md](Wireframe_Chat.md) for the shared header, drawer and portrait body. The spec content is retained as design intent. Differences are listed under [As-Built Deltas](#as-built-deltas) at the end of this file, as findings for the owner and Jason to decide (not resolved here). |

---

## 1. Executive Summary & Design Rationale

The Tachikoma Console is an immersive, multi-agent AI orchestration interface. However, an audit of the current layout revealed a critical **"Screen Real Estate Crisis"** on smaller and wider displays (tablets, mobile, and landscape desktop monitors). 

By stacking a tall, content-heavy header (containing per-model metrics) directly above active processing bars, file context chips, warning banners, and the input footer, up to **70% of the vertical viewport** was consumed by administrative UI, leaving a cramped window of only 150px-200px for the actual chat feed.

To solve this, we are introducing two major visual and structural layout paradigms:
1. **The VS Code-Style Compact Status Bar:** Reclaims up to **200px** of vertical height by collapsing all model, token, rate-limit, and sync metrics into a single, high-density, 24px-tall horizontal status bar at the absolute bottom of the viewport.
2. **The Landscape Roundtable Panel Layout:** A complete paradigm shift for landscape-oriented viewports (tablets, laptops, and desktop monitors). Instead of a continuous vertical timeline, the UI displays a **per-round panel discussion**, where each agent's response is streamed into its own dedicated column, with the Moderator's final synthesis on the far right.

---

## 2. The VS Code-Style Compact Status Bar

The compact status bar is omnipresent at the absolute bottom of the screen. It mimics the clean, professional, low-noise aesthetic of modern IDE status bars while maintaining the glowing, tactical SAC identity.

### 2.1 Visual Layout & Segments

```
+--------------------------------------------------------------------------------------------------------------------+
| 🟢 SECURE-LINK | 🤖 ACTIVE MODELS: [GEMINI-3.5-FLASH] | 📊 TPM: 14.5K/4M | 🧠 CONTEXT: 15% | ⏱️ RPM: 2/15 | 🔄 ROUND: 4   |
+--------------------------------------------------------------------------------------------------------------------+
```

* **Height:** `24px` (fixed)
* **Font:** `0.7rem` 'JetBrains Mono', monospace, uppercase.
* **Background:** Solid black (`#000000`) or deep graphite (`#050505`) with a `1px` top border in dark gray (`#222`).
* **Interactive Tooltips:** Hovering over any segment reveals a detailed tooltip with advanced counters (e.g., exact token counts, daily quota resets, or active agent names).

### 2.2 Semantic Color States

To prevent cognitive overload, the status bar remains low-contrast (muted gray-green) under normal operating parameters. When limits are approached, segments transition dynamically:

| Segment | Normal State (<80%) | Warning State (80% - 95%) | Danger State (>95%) |
| :--- | :--- | :--- | :--- |
| **Sync Status** | `🟢 SECURE-LINK` (Green) | `🟡 SYNCING...` (Amber) | `🔴 OFFLINE` (Red, blinking) |
| **TPM Meter** | Muted Blue-Gray | Amber (`--color-warning`) | Red (`--color-error`, blinking) |
| **Context Meter** | Muted Blue-Gray | Amber (`--color-warning`) | Red (`--color-error`, blinking) |
| **RPM Meter** | Muted Blue-Gray | Amber (`--color-warning`) | Red (`--color-error`, blinking) |

---

## 3. Landscape Roundtable Panel Layout

When a device is rotated to landscape or loaded on a desktop/tablet screen, the interface swaps from a standard messaging thread to a **Roundtable Panel**. This layout treats the multi-agent discussion as a real-time panel debate, focusing on **one round of conversation at a time**.

### 3.1 ASCII Wireframe (Landscape)

```
+--------------------------------------------------------------------------------------------------------------------+
| [V4.4] TACHIKOMA PROTOCOL // SECURE-LINK                                                (New Chat) (History) (PDF) |
+--------------------------------------------------------------------------------------------------------------------+
| [ USER INPUT ] Enter initiating prompt to send to the net...                                                [SEND] |
+--------------------------------------------------------------------------------------------------------------------+
| <   Viewing Round 3 of 5   >   | Prompt: "Compare SCSS and Tailwind 4 for performance..."                          |
+--------------------------------------------------------------------------------------------------------------------+
|                                             THE ROUNDTABLE DISCUSSION                                              |
|                                                                                                                    |
|  COLUMN 1: LOGIKOMA            |  COLUMN 2: GHOST-1            |  COLUMN 3: NEUTRAL            |  COLUMN 4: MODERATOR      |
|  (Chatter)                     |  (Chatter)                    |  (Chatter)                    |  (Speaks Last)            |
|  [style: border-blue]          |  [style: border-pink]         |  [style: border-orange]       |  [style: border-green]     |
|                                |                               |                               |                           |
|  Analysis:                     |  Philosophical Angle:         |  Neutral Input:               |  Synthesis:               |
|  SCSS compilation is done at   |  Tailwind shifts our focus    |  Both have distinct merits.   |  To summarize our panel:  |
|  build time, resulting in      |  from semantic naming to      |  SCSS is great for            |  SCSS remains ideal for   |
|  zero runtime overhead.        |  atomic utility thinking...   |  structured design            |  strict theme             |
|  Tailwind 4 uses a Rust-based  |  It forces utility-first      |  systems, while Tailwind      |  architectures, while     |
|  compiler which is extremely   |  styling directly onto the    |  accelerates prototyping      |  Tailwind accelerates     |
|  fast, but still generates     |  HTML markup...               |  and class composition...     |  prototyping...           |
|  utility classes...            |                               |                               |                           |
|                                |                               |                               |                           |
|                                |                               |                               |                           |
+--------------------------------------------------------------------------------------------------------------------+
| 🟢 SECURE-LINK  |  🤖 MODELS: [GEMINI-3.5-FLASH]  |  📊 TPM: 12K/4M  |  🧠 CONTEXT: 14%  |  ⏱️ RPM: 1/15  |  🔄 ROUND: 3 |
+--------------------------------------------------------------------------------------------------------------------+
```

### 3.2 Layout Grid Mechanics

* **Top-Anchored Full-Width Input:** The chat input field is moved to the absolute top of the viewport, spanning the full width. This is highly ergonomic in landscape because it prevents virtual keyboards (on tablets) or physical hands from covering the response area.
* **Round Navigation Bar:** Positioned directly below the input field. It features left/right chevron buttons (`<` and `>`) to navigate back and forth between past rounds. Next to the navigation controls, the user's initiating prompt for that round is displayed in a scrolling, low-contrast terminal block.
* **4-Column Grid:** 
  - The viewport below the navigation bar is divided into columns.
  - Chatter agents share equal fractions of the grid (`1fr`), while the Moderator column on the far right is given slightly more weight (`1.2fr`) to accommodate lengthier syntheses.
  - CSS Grid definition: `grid-template-columns: repeat(3, 1fr) 1.2fr;`
  - Gap: `1rem` (variable spacing).
* **Silence Protocol Visuals:** If a chatter agent decides to stay silent in the selected round (e.g., LOGIKOMA outputs `SILENCE`), their column displays a highly aesthetic, low-opacity cybernetic placeholder: `[SILENCE - No unique perspective to append]`.

---

## 4. Interaction Flow & State Machine

The Roundtable Panel operates on a strict **State-driven Round Navigation** model.

```mermaid
stateDiagram-v2
    [*] --> Idle: Chat Session Initialized
    
    Idle --> Processing: User submits prompt in Top Input
    note over Processing: All columns clear.<br/>Round counter increments.<br/>selectedViewRoundId set to currentRoundId.
    
    state Processing {
        [*] --> Column1_Thinking: LOGIKOMA begins
        Column1_Thinking --> Column1_Done: LOGIKOMA completes / silences
        
        Column1_Done --> Column2_Thinking: GHOST-1 begins
        Column2_Thinking --> Column2_Done: GHOST-1 completes / silences
        
        Column2_Done --> Column3_Thinking: NEUTRAL begins
        Column3_Thinking --> Column3_Done: NEUTRAL completes / silences
        
        Column3_Done --> Column4_Thinking: MODERATOR begins (Synthesizer)
        Column4_Thinking --> Column4_Done: MODERATOR completes
    }
    
    Processing --> Idle: Round complete, cost finalized
    
    Idle --> ViewingHistory: User clicks "<" on Round Navigation Bar
    note over ViewingHistory: selectedViewRoundId decrements.<br/>Grid displays historical responses for that round.
    
    ViewingHistory --> ViewingHistory: User navigates rounds
    ViewingHistory --> Idle: User clicks ">" back to active round or submits new prompt
```

---

## 5. Technical Implementation Blueprint

The layout switch is fully responsive, utilizing Angular signals for viewport detection and CSS media queries for clean presentation.

### 5.1 Component TypeScript State (`tachikoma-chat.component.ts`)

We introduce a `selectedViewRoundId` signal to track which round is currently being rendered in the Roundtable Grid.

```typescript
import { Component, signal, computed, HostListener } from '@angular/core';

// ... existing imports ...

export class TachikomaChatComponent {
  // Tracks the round currently being viewed in Landscape mode
  selectedViewRoundId = signal<number>(0);
  
  // Viewport orientation detection
  isLandscape = signal<boolean>(window.innerWidth >= window.innerHeight && window.innerWidth >= 768);

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isLandscape.set(window.innerWidth >= window.innerHeight && window.innerWidth >= 768);
  }

  // Helper to retrieve a specific agent's message in a specific round
  getAgentMessageForRound(agentId: string, roundId: number): ChatMessage | undefined {
    return this.messages.find(m => m.roundId === roundId && m.agentId === agentId);
  }

  // Helper to retrieve the user's prompt for a specific round
  getUserPromptForRound(roundId: number): ChatMessage | undefined {
    return this.messages.find(m => m.roundId === roundId && m.isUser);
  }

  // Navigation actions
  prevRound() {
    if (this.selectedViewRoundId() > 0) {
      this.selectedViewRoundId.update(id => id - 1);
    }
  }

  nextRound() {
    if (this.selectedViewRoundId() < this.currentRoundId) {
      this.selectedViewRoundId.update(id => id + 1);
    }
  }
}
```

### 5.2 Component HTML Structure (`tachikoma-chat.component.html`)

```html
<div class="tachikoma-container" [class.landscape-grid-mode]="isLandscape()">
    <div class="scanlines"></div>

    <!-- Header (Thin, no metrics, no API inputs) -->
    <header class="chat-header">
        <div class="header-left">
            <div class="version-badge">V4.4</div>
            <h1 class="protocol-title glitch">TACHIKOMA PROTOCOL</h1>
        </div>
        <div class="header-actions">
            <button (click)="showNewChatDialog()" class="new-chat-btn" matTooltip="New Chat">
                <mat-icon>add</mat-icon>
            </button>
            <button (click)="toggleHistoryDrawer()" class="history-btn" matTooltip="Chat History">
                <mat-icon>history</mat-icon>
            </button>
        </div>
    </header>

    <!-- PORTRAIT MODE: Standard Continuous Vertical Feed -->
    @if (!isLandscape()) {
        <main class="chat-main portrait-feed">
            <div class="chat-feed" #chatFeed>
                <div *ngFor="let msg of messages" class="message-wrapper">
                    <!-- Standard message bubbles -->
                </div>
            </div>
            
            <!-- Footer Input at Bottom for Portrait -->
            <footer class="chat-footer">
                <div class="input-wrapper">
                    <input type="text" [(ngModel)]="userInput" (keydown.enter)="triggerProtocol()" class="chat-input" placeholder="Send packet to the net...">
                    <button (click)="triggerProtocol()" class="send-btn">SEND</button>
                </div>
            </footer>
        </main>
    }

    <!-- LANDSCAPE MODE: Roundtable Panel Layout -->
    @else {
        <!-- Top-Anchored Input Bar -->
        <div class="top-input-bar">
            <div class="input-wrapper">
                <input type="text" [(ngModel)]="userInput" (keydown.enter)="triggerProtocol()" class="chat-input" placeholder="Send initiating prompt to the roundtable...">
                <button (click)="triggerProtocol()" class="send-btn">SEND</button>
            </div>
        </div>

        <!-- Round Navigation Bar -->
        <div class="round-nav-bar">
            <div class="nav-controls">
                <button [disabled]="selectedViewRoundId() === 0" (click)="prevRound()" class="nav-arrow">
                    <mat-icon>chevron_left</mat-icon>
                </button>
                <span class="round-indicator">ROUND {{ selectedViewRoundId() + 1 }} OF {{ currentRoundId + 1 }}</span>
                <button [disabled]="selectedViewRoundId() === currentRoundId" (click)="nextRound()" class="nav-arrow">
                    <mat-icon>chevron_right</mat-icon>
                </button>
            </div>
            <div class="round-prompt-preview">
                <span class="prompt-label">PROMPT:</span>
                <span class="prompt-text">"{{ getUserPromptForRound(selectedViewRoundId())?.text || 'No prompt in this round' }}"</span>
            </div>
        </div>

        <!-- Roundtable Grid -->
        <main class="chat-main landscape-columns">
            @for (agent of agents; track agent.id) {
                <div class="agent-column" 
                     [class.moderator-col]="agent.role === 'moderator'"
                     [style.border-color]="agent.hex">
                    
                    <div class="column-header" [style.background-color]="agent.hex + '1A'">
                        <span class="agent-name" [style.color]="agent.hex">{{ agent.name }}</span>
                        <span class="agent-role-badge">{{ agent.role === 'moderator' ? 'MODERATOR' : 'CHATTER' }}</span>
                    </div>

                    <div class="column-content">
                        @if (getAgentMessageForRound(agent.id, selectedViewRoundId()); as msg) {
                            <div class="msg-content" [innerHTML]="msg.html"></div>
                        } @else if (agent.status === 'thinking' && selectedViewRoundId() === currentRoundId) {
                            <!-- Blinking cursor / processing state -->
                            <div class="processing-indicator">
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                                <div class="typing-dot"></div>
                            </div>
                        } @else {
                            <div class="silence-placeholder">
                                <span>[SILENCE - No unique perspective to append]</span>
                            </div>
                        }
                    </div>
                </div>
            }
        </main>
    }

    <!-- VS CODE COMPACT STATUS BAR (Omnipresent at bottom) -->
    <footer class="vscode-status-bar">
        <div class="status-left">
            <span class="status-item sync-status"><span class="dot"></span>SECURE-LINK</span>
            <span class="status-sep">|</span>
            <span class="status-item"><mat-icon>smart_toy</mat-icon> MODELS: [GEMINI-3.5-FLASH]</span>
        </div>
        <div class="status-right">
            <span class="status-item"><mat-icon>token</mat-icon> TPM: {{ formatTokenCount(modelMetrics().get(selectedModel)?.tokensThisMinute || 0) }} / 4M</span>
            <span class="status-sep">|</span>
            <span class="status-item"><mat-icon>psychology</mat-icon> CONTEXT: {{ (modelMetrics().get(selectedModel)?.conversationContextTokens || 0) / 1048576 * 100 | number:'1.0-0' }}%</span>
            <span class="status-sep">|</span>
            <span class="status-item"><mat-icon>speed</mat-icon> RPM: {{ requestMetrics.requestTimestamps.length }} / {{ maxRequestsPerMinute }}</span>
            <span class="status-sep">|</span>
            <span class="status-item"><mat-icon>history</mat-icon> ACTIVE ROUND: {{ currentRoundId }}</span>
        </div>
    </footer>
</div>
```

### 5.3 Component SCSS Layout Rules (`tachikoma-chat.component.scss`)

```scss
/* VS Code Status Bar */
.vscode-status-bar {
    height: 24px;
    background-color: #000000;
    border-top: 1px solid #1a1a1a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 0.75rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: var(--text-secondary);
    z-index: 100;
    flex-shrink: 0;

    .status-left, .status-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .status-item {
        display: flex;
        align-items: center;
        gap: 0.25rem;

        mat-icon {
            font-size: 0.85rem;
            width: 0.85rem;
            height: 0.85rem;
        }
    }

    .status-sep {
        color: #333;
    }

    .sync-status {
        color: var(--neon-green);
        font-weight: bold;
        
        .dot {
            width: 6px;
            height: 6px;
            background-color: var(--neon-green);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 6px var(--neon-green);
        }
    }
}

/* Landscape Mode Adjustments */
.landscape-grid-mode {
    height: 100vh;
    display: flex;
    flex-direction: column;

    .top-input-bar {
        background-color: black;
        border-bottom: 1px solid #1a1a1a;
        padding: 0.75rem 1rem;
        flex-shrink: 0;

        .input-wrapper {
            max-width: 100%;
        }
    }

    .round-nav-bar {
        background-color: rgba(10, 10, 10, 0.9);
        border-bottom: 1px solid #1a1a1a;
        padding: 0.5rem 1rem;
        display: flex;
        align-items: center;
        gap: 2rem;
        flex-shrink: 0;

        .nav-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            
            .round-indicator {
                font-family: 'Share Tech Mono', monospace;
                font-size: 0.8rem;
                color: var(--neon-blue);
                letter-spacing: 0.05em;
                white-space: nowrap;
            }

            .nav-arrow {
                background: transparent;
                border: none;
                color: var(--neon-blue);
                cursor: pointer;
                padding: 0;
                display: flex;
                align-items: center;

                &:disabled {
                    color: #333;
                    cursor: not-allowed;
                }
            }
        }

        .round-prompt-preview {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            min-width: 0;

            .prompt-label {
                color: #6b7280;
                font-family: 'Share Tech Mono', monospace;
            }

            .prompt-text {
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                font-family: 'JetBrains Mono', monospace;
            }
        }
    }

    .landscape-columns {
        display: grid;
        grid-template-columns: repeat(3, 1fr) 1.2fr;
        gap: 1rem;
        padding: 1rem;
        flex: 1;
        overflow: hidden;
        background-color: var(--cyber-black);

        .agent-column {
            display: flex;
            flex-direction: column;
            border: 1px dashed rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            background: rgba(10, 10, 10, 0.6);
            overflow: hidden;
            transition: all 0.3s ease;

            &:hover {
                background: rgba(15, 15, 15, 0.8);
                border-style: solid;
            }

            &.moderator-col {
                border: 1px solid var(--neon-green);
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.05);
            }

            .column-header {
                padding: 0.5rem 0.75rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);

                .agent-name {
                    font-family: 'Share Tech Mono', monospace;
                    font-size: 0.85rem;
                    font-weight: bold;
                    letter-spacing: 0.05em;
                }

                .agent-role-badge {
                    font-size: 0.55rem;
                    color: #6b7280;
                    border: 1px solid #333;
                    padding: 1px 4px;
                    border-radius: 2px;
                    font-family: 'JetBrains Mono', monospace;
                }
            }

            .column-content {
                padding: 1rem;
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
            }

            .silence-placeholder {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #374151;
                font-size: 0.75rem;
                font-style: italic;
                text-align: center;
                font-family: 'JetBrains Mono', monospace;
            }
        }
    }
}
```

---

## 6. Design Sign-Off & Verification

This design contract is approved for implementation. 
* **Accessibility Check:** The compact status bar elements meet WCAG 2.1 AA contrast requirements and do not rely on color alone (icons and text status indicators are paired).
* **Responsive Check:** Verified that portrait mode remains a highly functional mobile messaging view, while landscape mode utilizes 100% of the widescreen layout to show multi-agent discussions in parallel.

---

## As-Built Deltas

*Added 2026-11-23 by Eunice. Each row compares the v1.0 spec above with the shipped code (`src/app/pages/tachikoma-chat/tachikoma-chat.component.{html,ts,scss}`). Every row is a **finding for the owner and Jason to decide**: either update the spec or story, or raise a fix shard via Poe. None is resolved here. The as-built reference is [Wireframe_ChatRoundtable.md](Wireframe_ChatRoundtable.md).*

| # | Area | Spec (v1.0) | Shipped code | Finding |
| :- | :--- | :--- | :--- | :--- |
| D1 | Column grid | `grid-template-columns: repeat(3, 1fr) 1.2fr` (§3.2, §5.3): exactly 4 columns, the moderator wider | `.landscape-columns { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) }`: equal widths, any agent count, wraps to a new row when narrow | Verified. The moderator gets no extra weight, and on about 768–1000px viewports a 4th agent wraps. |
| D2 | Moderator position | Far-right column, "Speaks Last" (§3.1, §3.2) | Columns follow `agents` order. With the defaults this is LOGIKOMA, GHOST-1, **MODERATOR**, NEUTRAL, so the moderator is third. `.moderator-col` adds only a left border accent. | Verified. |
| D3 | Status bar sync segment | Three states: `SECURE-LINK` (green), `SYNCING...` (amber), `OFFLINE` (red, blinking) (§2.2) | Text is **always** `SECURE-LINK`. It turns amber (`.status-warn` + `.dot-warn`) when `contextSoftWarning` is non-null (any model ≥ 80% context). It does not reflect sync or online state. The spec's own §5.2 blueprint also hard-codes `SECURE-LINK`, so the spec is internally inconsistent. | Verified. The amber state means "context near limit", not "syncing". |
| D4 | Round label | ASCII shows "Viewing Round 3 of 5" and "ROUND: 3" (the same number); §5.2 binds the nav to `selectedViewRoundId() + 1 OF currentRoundId + 1` and the status bar to `ACTIVE ROUND: {{ currentRoundId }}` | Nav (`chat-round-indicator`): `ROUND {{ selectedViewRoundId() + 1 }} OF {{ currentRoundId + 1 }}`. Status bar: `ROUND {{ currentRoundId }}`. | **Off by one, verified.** During the first round the nav says `ROUND 1 OF 1` and the status bar says `ROUND 0`. After round 1 completes, the nav says `ROUND 1 OF 2` and the status bar says `ROUND 1`. The nav total also counts the upcoming empty round. |
| D5 | data-test-id map | None in the spec | Shipped ids: `chat-attach-file-btn-landscape`, `chat-message-input`, `chat-send-btn`, `chat-round-prev-btn`, `chat-round-indicator`, `chat-round-next-btn`, `chat-agent-message`, `chat-clear-files-btn`, `chat-remove-file-btn`, `chat-soft-limit-banner`, `chat-status-bar` | The spec had no testability contract. See the Wireframe_ChatRoundtable.md map and its Design Gaps (columns, SILENCE placeholder, status segments). |
| D6 | Status bar colour | Black `#000` / graphite `#050505`, `#222` top border (§2.1) | VS Code blue `#007acc` background, white text | Visual identity deviation, hard-coded rather than a `_sac-tokens.scss` token. |
| D7 | Models segment | `ACTIVE MODELS: [list]` | `primaryModel`: the **first** model in use only. The TPM and CTX metrics are also for the first model only. | Multi-model chats under-report. |
| D8 | Tooltips | Every segment has a tooltip (§2.1) | Only TPM, CTX, RPM and ROUND have `matTooltip`. Sync and model have none. | Partial. |
| D9 | Extra status segment | Not specified | A `PROCESSING` segment (spinning `sync` icon) appears while `isProcessing` | Additive; record in the spec if kept. |
| D10 | Landscape detection | `innerWidth >= innerHeight && innerWidth >= 768` | `innerWidth >= 768 && innerWidth > innerHeight` (strict) | A square viewport stays portrait. Minor. |
| D11 | Round counter timing | State diagram: on entering Processing, "All columns clear. Round counter increments." | `currentRoundId++` happens **after** all agents, title generation and the cost estimate. During processing, the view is set to the current (not yet incremented) round. | Behaviourally equivalent for the view; the spec note is inaccurate. |
| D12 | Speaking order | Fixed sequence LOGIKOMA, GHOST-1, NEUTRAL, then MODERATOR (§4) | Chatters are **shuffled** each round; moderators go last | The spec diagram implies a fixed order. |
| D13 | Next-round navigation | `>` returns to the active round | After a completed round, Next can move onto the **empty upcoming round** ("No prompt yet — type above to begin.") because `currentRoundId` is already incremented | UX question for Jason. |
| D14 | SILENCE placeholder | Shown when the agent chose silence | Also shown for agents that **have not spoken yet** in the active round (queued behind the current speaker), because only `thinking` agents get typing dots | Misleading during processing. |
| D15 | Header | One line: `[V4.4] TACHIKOMA PROTOCOL // SECURE-LINK` with (New Chat) (History) (PDF) | Title plus a second line "SYNC MODE: SECURE-LINK"; New Chat, History, and an **export dropdown** (TXT / PDF / DOCX, only when messages exist); the API key input and INIT appear in the header when no key is set | Additive and differs from the spec. |
| D16 | Section heading | "THE ROUNDTABLE DISCUSSION" heading above the columns | No heading | Minor. |
| D17 | File bar and soft-limit banner placement | Not specified for landscape | Both render **below** the columns; portrait puts the banner above the feed | Unspecified; confirm the intent. |
| D18 | Hard-limit notice | Not specified | Hard-limit messages have no `agentId`, so they are **never shown in landscape** | Gap affecting OPER-002 in landscape. |
| D19 | Traceability | Spec only | No story or shard in `docs/stories` or `docs/shards` covers the roundtable or status bar | Jason / Poe: add a story or shard if this is to be gated. |
