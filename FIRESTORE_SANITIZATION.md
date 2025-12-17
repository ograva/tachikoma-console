# Firestore Data Sanitization & Normalization

## Problem
Firestore write errors were occurring due to **undefined fields** being sent to Firestore. Firestore does not allow `undefined` values - fields must either be `null` or omitted entirely.

## Root Cause
Services were spreading data objects directly without filtering undefined values:
```typescript
await setDoc(docRef, { ...data, userId }); // ❌ Could include undefined fields
```

## Solution Overview
Implemented a **2-stage normalization pattern**:

1. **WRITE**: Sanitize data before saving to Firestore (remove undefined fields)
2. **READ**: Normalize data after retrieval (add missing fields with defaults)

---

## Changes Made

### 1. FirestoreService (`firestore.service.ts`)

#### Added `sanitizeForFirestore()` Method
Recursively removes undefined fields from data before Firestore writes:

```typescript
private sanitizeForFirestore<T>(data: T): Partial<T> {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data as any)) {
    if (value === undefined) {
      // Skip undefined fields entirely
      continue;
    }
    
    if (value === null) {
      // Null is allowed in Firestore
      sanitized[key] = null;
    } else if (Array.isArray(value)) {
      // Recursively sanitize array items
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null 
          ? this.sanitizeForFirestore(item) 
          : item
      );
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = this.sanitizeForFirestore(value);
    } else {
      // Primitive values are safe
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
```

#### Updated `saveDocument()` Method
Now sanitizes data before calling `setDoc()`:

```typescript
const sanitizedData = this.sanitizeForFirestore({ ...data, userId }) as any;
await setDoc(docRef, sanitizedData);
```

**Key Features:**
- ✅ Handles nested objects recursively
- ✅ Handles arrays of objects
- ✅ Preserves `null` values (allowed in Firestore)
- ✅ Skips `undefined` values entirely
- ✅ Leaves primitive values untouched

---

### 2. UserProfileService (`user-profile.service.ts`)

#### Added `normalizeProfile()` Method
Ensures all optional fields have proper defaults when reading data:

```typescript
private normalizeProfile(profile: Partial<UserProfile>): UserProfile {
  return {
    ...profile,
    geminiModel: profile.geminiModel ?? 'gemini-2.5-flash',
    rateLimitRPM: profile.rateLimitRPM ?? 15,
    geminiApiKey: profile.geminiApiKey ?? '',
    photoURL: profile.photoURL ?? null,
    chatUsername: profile.chatUsername || 'USER',
    displayName: profile.displayName || '',
  } as UserProfile;
}
```

#### Updated Data Loading Points
Applied normalization in two places:

1. **Loading from Firestore** (`loadOrCreateProfile()`):
   ```typescript
   const normalizedProfile = this.normalizeProfile(existing);
   ```

2. **Loading from localStorage** (`loadFromLocalStorage()`):
   ```typescript
   const profile = JSON.parse(stored) as UserProfile;
   const normalizedProfile = this.normalizeProfile(profile);
   this.profileSignal.set(normalizedProfile);
   ```

**Default Values:**
- `geminiModel`: `'gemini-2.5-flash'`
- `rateLimitRPM`: `15` (free tier)
- `geminiApiKey`: `''` (empty string)
- `photoURL`: `null`
- `chatUsername`: `'USER'`
- `displayName`: `''`

---

### 3. AgentProfileService (`agent-profile.service.ts`)

#### Added `normalizeProfile()` Method
Ensures optional fields have defaults:

```typescript
private normalizeProfile(profile: Partial<AgentProfile>): AgentProfile {
  return {
    ...profile,
    silenceProtocol: profile.silenceProtocol ?? 'standard',
    status: profile.status ?? 'idle',
    createdAt: profile.createdAt ?? Date.now(),
    updatedAt: profile.updatedAt ?? Date.now(),
  } as AgentProfile;
}
```

#### Updated Data Loading Points
Applied normalization in two places:

1. **Loading from localStorage** (`loadProfiles()`):
   ```typescript
   const profiles = JSON.parse(stored);
   const normalizedProfiles = profiles.map((p: any) => this.normalizeProfile(p));
   this.profilesSignal.set(normalizedProfiles);
   ```

2. **Loading from Firestore** (`loadFromCloud()`):
   ```typescript
   const profiles = await this.firestoreService.getDocuments<AgentProfile>(
     this.COLLECTION_NAME
   );
   const normalizedProfiles = profiles.map(p => this.normalizeProfile(p));
   this.profilesSignal.set(normalizedProfiles);
   ```

**Default Values:**
- `silenceProtocol`: `'standard'`
- `status`: `'idle'`
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

---

### 4. ChatStorageService (`chat-storage.service.ts`)

#### Added `normalizeSession()` Method
Ensures all optional/required fields have proper defaults:

```typescript
private normalizeSession(session: Partial<ChatSession>): ChatSession {
  return {
    ...session,
    description: session.description ?? '',
    messages: session.messages ?? [],
    conversationSummary: session.conversationSummary ?? '',
    participatingAgents: session.participatingAgents ?? [],
    createdAt: session.createdAt ?? Date.now(),
    updatedAt: session.updatedAt ?? Date.now(),
  } as ChatSession;
}
```

#### Updated Data Loading Points
Applied normalization in two places:

1. **Loading from localStorage** (`loadSessions()`):
   ```typescript
   const sessions = JSON.parse(stored);
   const normalizedSessions = sessions.map((session: any) =>
     this.normalizeSession(session)
   );
   this.sessionsSignal.set(normalizedSessions);
   ```

2. **Loading from Firestore** (`loadFromCloud()`):
   ```typescript
   const chats = await this.firestoreService.getDocuments<ChatSession>(
     this.COLLECTION_NAME
   );
   const normalizedChats = chats.map(chat => this.normalizeSession(chat));
   this.sessionsSignal.set(normalizedChats);
   ```

**Default Values:**
- `description`: `''` (empty string)
- `messages`: `[]` (empty array)
- `conversationSummary`: `''`
- `participatingAgents`: `[]`
- `createdAt`: Current timestamp
- `updatedAt`: Current timestamp

---

## Data Flow Pattern

### WRITE PATH (localStorage → Firestore)
1. User action triggers data save
2. Service calls `ChatStorageService.saveChat()` (or similar)
3. Data saved to localStorage immediately (with undefined fields OK)
4. `FirestoreService.saveDocument()` called
5. **NEW**: `sanitizeForFirestore()` removes undefined fields
6. Clean data sent to Firestore via `setDoc()`

### READ PATH (Firestore → Application)
1. User logs in or syncs data
2. Service calls `FirestoreService.getDocuments()`
3. Raw data retrieved from Firestore
4. **NEW**: Service applies `normalizeProfile()` / `normalizeSession()`
5. Normalized data with defaults set in signal
6. Saved to localStorage as backup

---

## Testing Checklist

### Manual Testing Steps
1. ✅ Build succeeds without TypeScript errors
2. ⬜ Create new chat with description field populated
3. ⬜ Create new chat with description field empty (undefined)
4. ⬜ Verify both chats save to Firestore without errors
5. ⬜ Update user profile with API key
6. ⬜ Update user profile leaving optional fields empty
7. ⬜ Create/edit agent profiles with optional fields
8. ⬜ Login and verify data syncs from Firestore correctly
9. ⬜ Check browser console for Firestore write errors (should be zero)
10. ⬜ Verify data appears correctly in Firestore console

### Edge Cases to Test
- Empty strings vs undefined vs null
- Arrays with nested objects
- Deeply nested object structures
- Old data without new optional fields
- Migration scenarios (legacy data → normalized data)

---

## Impact Assessment

### Benefits
✅ **No Firestore Write Errors**: All undefined fields filtered before writes
✅ **Data Consistency**: Missing fields always have predictable defaults
✅ **Backward Compatible**: Handles old data without new fields gracefully
✅ **Type Safe**: TypeScript interfaces remain unchanged
✅ **Transparent**: No breaking changes to existing code

### Performance
- Negligible overhead: Sanitization runs once per save operation
- Normalization runs once per data load operation
- No additional network requests
- No impact on localStorage operations

### Maintenance
- Centralized sanitization in `FirestoreService`
- Service-specific normalization keeps defaults near interface definitions
- Easy to extend for new optional fields
- Self-documenting code pattern

---

## Future Improvements

### Optional Enhancements
1. **Validation Layer**: Add Zod/Yup schema validation before saves
2. **Migration Helpers**: Automated data migration for schema changes
3. **Versioning**: Add schema version field for future migrations
4. **Logging**: Add debug logging for sanitization/normalization steps
5. **Unit Tests**: Add tests for sanitization edge cases

### Known Limitations
- Sanitization uses `any` type casting for Firestore compatibility
- Normalization assumes reasonable defaults (may need adjustment)
- No automatic detection of new optional fields (must manually add to normalize methods)

---

## Related Files
- [firestore.service.ts](src/app/services/firestore.service.ts)
- [user-profile.service.ts](src/app/services/user-profile.service.ts)
- [agent-profile.service.ts](src/app/services/agent-profile.service.ts)
- [chat-storage.service.ts](src/app/services/chat-storage.service.ts)

## References
- [Firestore Data Types](https://firebase.google.com/docs/firestore/manage-data/data-types)
- [Angular Signals Documentation](https://angular.dev/guide/signals)
- [TypeScript Nullish Coalescing](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#nullish-coalescing)
