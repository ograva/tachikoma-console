# 2-Stage Data Persistence Implementation

## Overview

The Tachikoma Console now features a **2-stage data persistence system** that provides offline-first functionality with cloud backup and synchronization.

## Architecture

### Stage 1: localStorage (Immediate)
- All data writes go to `localStorage` first
- Provides instant UI updates
- Works completely offline
- No authentication required

### Stage 2: Firestore (Cloud Backup)
- Data automatically syncs to Firestore when authenticated
- Enabled offline caching for seamless experience
- Encrypted API keys in cloud storage
- Per-user data isolation

## Data Flow

### Write Operations
```
User Action → localStorage (instant) → Firestore (async) → Done
                     ↓
                 Update UI
```

### Read Operations
```
App Load → localStorage (instant display)
            ↓
        Firestore (background sync if authenticated)
            ↓
        Merge if differences detected
```

### Login Sync Flow
```
User Logs In → Check for local data
                ↓
            Show Sync Dialog
                ↓
        User Chooses Strategy:
        - Merge (recommended)
        - Cloud to Local
        - Local to Cloud
                ↓
            Sync Firestore ↔ localStorage
                ↓
            Continue to App
```

## Encrypted Data

### API Key Encryption
- **localStorage**: Plain text (browser-secured)
- **Firestore**: AES-GCM encrypted with user-specific key
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Algorithm**: AES-256-GCM

### Implementation
```typescript
// Encrypt before upload
const encrypted = await encryptionService.encrypt(apiKey, userId);

// Decrypt after download
const plainKey = await encryptionService.decrypt(encrypted, userId);
```

## Firestore Database Structure

```
firestore/
└── users/
    └── {userId}/
        ├── user_profile/
        │   └── {userId}
        │       ├── id
        │       ├── email
        │       ├── displayName
        │       ├── chatUsername
        │       ├── photoURL
        │       ├── geminiApiKeyEncrypted (encrypted)
        │       ├── geminiModel
        │       ├── createdAt
        │       └── updatedAt
        │
        ├── agent_profiles/
        │   └── {agentId}
        │       ├── id
        │       ├── name
        │       ├── color
        │       ├── hex
        │       ├── temp
        │       ├── system
        │       ├── role
        │       ├── silenceProtocol
        │       ├── createdAt
        │       └── updatedAt
        │
        └── chat_sessions/
            └── {chatId}
                ├── id
                ├── title
                ├── conversationSummary
                ├── participatingAgents[]
                ├── messages[]
                │   └── {message}
                │       ├── id
                │       ├── sender
                │       ├── text
                │       ├── html
                │       ├── isUser
                │       ├── agentId
                │       └── timestamp
                ├── createdAt
                └── updatedAt
```

## Security Rules

### Firestore Rules
- Users can only access their own data
- Profile ID must match user ID
- Timestamps required on all writes
- Chat messages must be arrays

### Rule Highlights
```javascript
// User can only read/write their own data
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}

// Ensure timestamps on updates
allow update: if request.resource.data.updatedAt is timestamp;
```

## Sync Strategies

### 1. Merge (Recommended)
- Combines local and cloud data
- Prefers newer version based on `updatedAt` timestamp
- Keeps all unique items
- **Use when**: Normal login, want to keep both local and cloud changes

### 2. Cloud to Local
- Replaces all local data with cloud data
- Discards local changes
- **Use when**: Switching devices, want fresh cloud data

### 3. Local to Cloud
- Replaces all cloud data with local data
- Uploads everything from device
- **Use when**: Cloud is outdated, trust local data more

## Error Handling

### Console Logging
All errors are logged to console with descriptive messages:

```typescript
console.error('Error syncing chat to cloud:', error);
console.error('Error loading profiles from cloud:', error);
console.error('Encryption error:', error);
```

### Graceful Degradation
- If Firestore fails, app continues with localStorage
- Sync errors don't block user actions
- Offline mode works seamlessly with Firestore offline cache

## Services Updated

### 1. EncryptionService (NEW)
- **Purpose**: Encrypt/decrypt sensitive data
- **Location**: `src/app/services/encryption.service.ts`
- **Methods**:
  - `encrypt(plaintext, userId)`: AES-GCM encryption
  - `decrypt(encrypted, userId)`: Decryption

### 2. FirestoreService (ENHANCED)
- **Purpose**: Manage Firestore operations with localStorage fallback
- **Location**: `src/app/services/firestore.service.ts`
- **New Methods**:
  - `syncOnLogin(strategy)`: Sync with user-chosen strategy
  - `saveBatch(documents)`: Batch save for large operations
  - `getDocumentsPaginated(ids)`: Handle large collections

### 3. AgentProfileService (ENHANCED)
- **Purpose**: Manage agent profiles with cloud sync
- **Location**: `src/app/services/agent-profile.service.ts`
- **Changes**:
  - All CRUD methods now async
  - Auto-sync to cloud on changes
  - Added `createdAt` and `updatedAt` timestamps
  - Implements `SyncableData` interface

### 4. ChatStorageService (ENHANCED)
- **Purpose**: Manage chat sessions with cloud sync
- **Location**: `src/app/services/chat-storage.service.ts`
- **Changes**:
  - All CRUD methods now async
  - Auto-sync to cloud on changes
  - Large chat detection (warns at 900KB)
  - `loadFromCloud()` method for post-login sync

### 5. UserProfileService (ENHANCED)
- **Purpose**: Manage user profile with encrypted API key
- **Location**: `src/app/services/user-profile.service.ts`
- **Changes**:
  - API key encrypted before Firestore upload
  - Auto-decrypt on download
  - Plain text in localStorage for app use

### 6. AuthService (ENHANCED)
- **Purpose**: Authentication with sync trigger
- **Location**: `src/app/services/auth.service.ts`
- **Changes**:
  - Detects first login with local data
  - Triggers sync dialog
  - `setSyncCallback()` for sync coordination

## Components Added

### SyncDialogComponent (NEW)
- **Purpose**: User-friendly sync strategy selection
- **Location**: `src/app/components/sync-dialog/sync-dialog.component.ts`
- **Features**:
  - Three sync strategy options
  - Visual cards with icons
  - Recommended badge on Merge option
  - Responsive design (grid → stack on mobile)

## Usage Examples

### Creating a Chat (with auto-sync)
```typescript
const chat = await chatStorage.createNewChat('My Chat', selectedAgents);
// Instantly appears in UI, syncs to cloud in background
```

### Updating Agent Profile (with auto-sync)
```typescript
await agentProfileService.updateProfile(agentId, { temp: 0.5 });
// Updates localStorage immediately, syncs to Firestore
```

### Saving API Key (with encryption)
```typescript
await userProfileService.updateGeminiApiKey('your-api-key');
// Saved plain in localStorage, encrypted in Firestore
```

### Manual Sync on Login
```typescript
// In login component
await firestoreService.syncOnLogin('merge');
```

## Testing Scenarios

### Test 1: Anonymous to Authenticated
1. Use app without login (localStorage only)
2. Create chats, customize agents
3. Login with Google
4. Choose "Merge" in sync dialog
5. Verify data preserved and synced to cloud

### Test 2: Multi-Device Sync
1. Login on Device A, create data
2. Login on Device B with same account
3. Choose "Cloud to Local"
4. Verify Device B has Device A's data

### Test 3: Offline Mode
1. Login and use app online
2. Disconnect internet
3. Continue using app (Firestore offline cache)
4. Reconnect internet
5. Verify automatic sync

### Test 4: API Key Encryption
1. Save API key while logged in
2. Check Firestore console
3. Verify `geminiApiKeyEncrypted` is gibberish
4. Logout and login
5. Verify API key still works (decrypted correctly)

## Deployment Checklist

- [x] Update Firestore security rules
- [x] Enable Firestore offline persistence
- [x] Test encryption/decryption
- [x] Test all three sync strategies
- [x] Verify error logging
- [x] Test anonymous → authenticated flow
- [x] Test large chat handling (>900KB warning)
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Monitor Firestore usage/quotas
- [ ] Test on production Firebase project

## Known Limitations

1. **Chat Size**: Single chat documents limited to ~1MB
   - **Mitigation**: Warning logged at 900KB
   - **Future**: Implement message pagination

2. **Encryption**: Client-side encryption, key derived from UID
   - **Security**: Secure for cloud storage, but not end-to-end encrypted
   - **Future**: Consider server-side key management

3. **Conflict Resolution**: Based on timestamps only
   - **Edge Case**: Concurrent edits on multiple devices
   - **Mitigation**: Last-write-wins strategy with timestamps

## Performance Considerations

- **localStorage**: Synchronous, fast (<5ms for typical data)
- **Firestore**: Asynchronous, network-dependent
- **Offline Cache**: Enabled, provides instant reads when offline
- **Batch Writes**: Used for syncing multiple documents
- **Encryption**: ~10-50ms per API key operation

## Monitoring

### Console Messages
- `✓ Synced {collection}: X items` - Successful sync
- `✗ Error syncing {collection}:` - Sync failure
- `📝 Conversation summary updated` - Auto-summary
- `⚠️ Chat is large (XKB)` - Size warning

### Error Types to Watch
- `Firestore not configured` - Firebase setup issue
- `Encryption error` - Crypto API failure
- `Error saving to Firestore` - Network/quota issue
- `Error loading from cloud` - Read permission issue

## Future Enhancements

1. **Real-time Sync**: Listen to Firestore changes for multi-device updates
2. **Message Pagination**: Split large chats into multiple documents
3. **Conflict UI**: Show conflicts to user when timestamps equal
4. **Compression**: Compress large chat messages before upload
5. **Selective Sync**: Let users choose which chats to sync
6. **Export/Import**: JSON export for data portability
