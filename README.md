# Tachikoma Console

A futuristic multi-agent AI chat system built with Angular 19 and the Gemini API.

## Overview

Tachikoma Console is a cyberpunk-themed dashboard and AI chat interface featuring a sophisticated multi-agent system. It integrates with Google's Gemini 2.0 Flash Exp API to power three distinct agent personas that collaborate to provide comprehensive responses:

* **LOGIKOMA** (◈): A pure analytical engine with temperature 0.2 for logical precision and data analysis.
* **GHOST-1** (❖): A philosophical consciousness with temperature 0.9 for abstract thinking and challenging assumptions.
* **MODERATOR** (⬢): A synthesis agent with temperature 0.5 that bridges logic and philosophy into cohesive insights.

## Features

* **Multi-Agent Chat Protocol**: Three specialized AI agents process queries in randomized order with SILENCE PROTOCOL (agents skip redundant responses).
* **2-Stage Data Persistence**: Offline-first architecture with localStorage (instant) + Firestore (cloud sync) for chats, agent profiles, and settings.
* **Encrypted Cloud Storage**: API keys encrypted with AES-256-GCM before Firestore upload, decrypted on retrieval.
* **Smart Sync System**: User-selectable sync strategies (Merge, Cloud-to-Local, Local-to-Cloud) on login with local data detection.
* **Neural Activity Panel**: Real-time visualization of agent processing that appears during query execution and auto-hides when idle.
* **First-Time User Explainer**: Interactive dialog that guides new users through the multi-agent system (localStorage-tracked).
* **Markdown Support**: Full message rendering with code blocks, lists, and formatting via the `marked` library.
* **Chat Export**: Download conversations as PDF or DOCX documents with file-saver integration.
* **Cyberpunk UI**: Custom dark theme with neon accents (cyan, magenta, green), CRT scanlines, and glitch effects.
* **Angular 19**: Built with latest Angular features including Signals for reactive state management and Standalone Components.
* **Gemini API Integration**: Uses `@google/genai` SDK (v1.30.0) for Google Generative AI.
* **Fully Responsive**: Optimized layouts for desktop, tablet, and mobile with breakpoint-aware components.
* **PWA Ready**: Configured with manifest and icons for mobile installation.
* **Dark Theme**: Consistent cyberpunk aesthetic across login, dashboard, and chat interfaces.
* **Offline Mode**: Full functionality without internet via Firestore offline caching and localStorage fallback.

## Getting Started

### Prerequisites

* Node.js (v18 or higher)
* npm or yarn
* A Google Gemini API Key

### Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd tachikoma-console
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start the development server:

    ```bash
    npm start
    ```

4. Open your browser to `http://localhost:4200/`.

5. Navigate to **Tachikoma Chat** and enter your Gemini API Key to initialize the protocol.

## Project Structure

```text
tachikoma-console/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── tachikoma-chat/          # Multi-agent chat interface
│   │   │   │   ├── tachikoma-chat.component.ts
│   │   │   │   ├── chat-explainer-dialog.component.ts
│   │   │   ├── starter/                 # Dashboard landing page
│   │   │   ├── authentication/          # Login/register pages
│   │   ├── layouts/
│   │   │   ├── full/                    # Main app layout (header, sidebar)
│   │   │   ├── blank/                   # Minimal layout (auth pages)
│   │   ├── services/
│   │   │   ├── agent-profile.service.ts # Agent configuration with cloud sync
│   │   │   ├── chat-storage.service.ts  # Chat persistence (localStorage + Firestore)
│   │   │   ├── auth.service.ts          # Firebase authentication with sync triggers
│   │   │   ├── firestore.service.ts     # Store-forward pattern for cloud sync
│   │   │   ├── encryption.service.ts    # AES-256-GCM encryption for API keys
│   │   │   ├── user-profile.service.ts  # User settings with encrypted cloud storage
│   │   ├── components/
│   │   │   ├── sync-dialog/             # Sync strategy selection dialog
│   │   ├── material.module.ts           # Centralized Material imports
│   │   ├── app.routes.ts                # Route configuration
│   ├── assets/
│   │   ├── images/
│   │   │   ├── icons/                   # PWA icons
│   │   │   ├── logos/                   # SAC branding
│   │   ├── scss/                        # Global styles and themes
├── public/
│   ├── manifest.webmanifest             # PWA configuration
```

## Architecture

### State Management
- **Angular Signals**: Reactive state management using Angular 19 signals (not RxJS observables)
- **localStorage**: Immediate data persistence for offline-first experience
- **Firestore**: Cloud backup and cross-device synchronization
- **Component-level State**: Signals for `showNeuralActivity`, agent statuses, chat messages

### Data Persistence (2-Stage System)
- **Stage 1 (localStorage)**: All writes happen instantly to localStorage for immediate UI updates
- **Stage 2 (Firestore)**: Data automatically syncs to cloud when authenticated (async, non-blocking)
- **Offline Cache**: Firestore offline persistence enabled for seamless offline experience
- **Sync Strategies**: User chooses how to merge local/cloud data on login (Merge/Cloud-to-Local/Local-to-Cloud)
- **Encryption**: API keys encrypted with AES-256-GCM before Firestore upload, plain text in localStorage
- **Conflict Resolution**: Timestamp-based (prefers newer `updatedAt` values)

### Security
- **Per-User Isolation**: Firestore rules ensure users only access their own data
- **Encrypted API Keys**: User-specific encryption keys derived from UID with PBKDF2 (100k iterations)
- **Timestamp Validation**: All Firestore writes require valid `updatedAt` timestamps
- **Type Enforcement**: Firestore rules validate data structure (arrays, required fields)

### Agent System
- **Randomized Processing**: Agents process in shuffled order to prevent response bias
- **Silence Protocol**: Agents automatically skip when prior responses cover their perspective
- **Temperature Control**: Each agent has optimized temperature settings for their cognitive role
- **Cloud Sync**: Agent profiles sync across devices with timestamp-based conflict resolution

### Responsive Design
- **Breakpoints**: Mobile (<768px), Tablet (769-1024px), Desktop (>1024px)
- **Layout Adaptation**: Header restructures for mobile with unified action bar
- **Conditional Components**: Neural activity panel and controls adapt to viewport

## Technologies

- **Angular 19** - Latest framework with signals and standalone components
- **TypeScript 5.8.3** - Type-safe development
- **@google/genai v1.30.0** - Gemini API integration
- **Angular Material** - UI component library
- **Tabler Icons** - Icon system via `angular-tabler-icons`
- **marked** - Markdown parsing for chat messages
- **jsPDF & docx** - Document export functionality
- **Firebase** - Authentication and Firestore integration
- **Web Crypto API** - AES-256-GCM encryption for sensitive data
- **Firestore Offline** - Persistent cache for offline functionality

## Data Persistence & Sync

The app uses a **2-stage persistence system** for offline-first functionality:

### For Anonymous Users
- All data stored in `localStorage` only
- No authentication required
- Full chat functionality without cloud sync

### For Authenticated Users
1. **Write Operations**: Data written to localStorage (instant) → Firestore (async background sync)
2. **Read Operations**: Load from localStorage (instant display) → Sync from Firestore in background
3. **First Login**: Sync dialog appears if local data exists, user chooses strategy:
   - **Merge** (recommended): Combines local and cloud data, prefers newer timestamps
   - **Cloud to Local**: Replaces local with cloud data (for switching devices)
   - **Local to Cloud**: Uploads all local data to cloud (for backing up device data)

### Offline Mode
- App works fully offline with Firestore offline cache
- All changes saved to localStorage immediately
- Auto-syncs to cloud when connection restored

For detailed implementation, see [PERSISTENCE_IMPLEMENTATION.md](./PERSISTENCE_IMPLEMENTATION.md).

## Contributing

Contributions are welcome! Please ensure:
- Components use standalone pattern with explicit imports
- State management uses Angular signals (not RxJS)
- Material imports come from centralized `MaterialModule`
- Follow existing cyberpunk theme conventions
- All data operations use the 2-stage persistence pattern (localStorage → Firestore)
- Sensitive data encrypted before Firestore upload (see EncryptionService)

## License

This project is open source.

---

### System Status: ◈ ONLINE ❖ OPERATIONAL ⬢ READY
