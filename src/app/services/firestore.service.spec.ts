import { TestBed } from '@angular/core/testing';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';

/**
 * SYNC-001: Save Locally Before Cloud Sync — local-first write path
 * SYNC-004: Isolate SAC Firestore data — use dedicated Firestore database
 *
 * Firestore is deliberately NOT provided so the service runs in localStorage-only
 * mode. This lets us verify local-first behavior and path construction without
 * a real database. Dedicated-database isolation is asserted via integration tests
 * args in the authenticated-user path (covered via integration by design).
 */
describe('FirestoreService (SYNC-001/003/004)', () => {
  let service: FirestoreService;
  let mockAuth: jasmine.SpyObj<AuthService>;
  const userId = { value: null as string | null };

  beforeEach(() => {
    localStorage.clear();

    mockAuth = jasmine.createSpyObj('AuthService', [
      'getCurrentUserId',
      'isRealUser',
    ]);
    mockAuth.getCurrentUserId.and.callFake(() => userId.value);
    mockAuth.isRealUser.and.callFake(() => userId.value !== null);

    TestBed.configureTestingModule({
      providers: [
        FirestoreService,
        { provide: AuthService, useValue: mockAuth },
        // Firestore intentionally omitted — service degrades to localStorage-only
      ],
    });

    service = TestBed.inject(FirestoreService);
  });

  afterEach(() => {
    localStorage.clear();
    userId.value = null; // reset shared mutable state between tests
  });

  // ── Degraded mode checks ───────────────────────────────────────────────────

  describe('when Firestore is not configured', () => {
    it('should report isFirestoreConfigured = false', () => {
      expect(service.isFirestoreConfigured()).toBeFalse();
    });
  });

  // ── SYNC-001: local-first saveDocument ────────────────────────────────────

  describe('saveDocument (local-first)', () => {
    it('should write to localStorage immediately', async () => {
      const doc = { id: 'doc-1', title: 'Test', updatedAt: Date.now() };
      await service.saveDocument('chat_sessions', doc as any);

      const stored = localStorage.getItem('firestore_anonymous_chat_sessions');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.some((d: any) => d.id === 'doc-1')).toBeTrue();
    });

    it('should update an existing document in localStorage', async () => {
      const doc = { id: 'upd-1', value: 'original', updatedAt: 1 };
      await service.saveDocument('settings', doc as any);

      const updated = { id: 'upd-1', value: 'changed', updatedAt: 2 };
      await service.saveDocument('settings', updated as any);

      const stored = JSON.parse(
        localStorage.getItem('firestore_anonymous_settings') || '[]',
      );
      const found = stored.find((d: any) => d.id === 'upd-1');
      expect(found?.value).toBe('changed');
      expect(stored.filter((d: any) => d.id === 'upd-1').length).toBe(1);
    });

    it('should use a user-keyed localStorage path for authenticated users', async () => {
      userId.value = 'user-abc';
      const doc = { id: 'chat-x', updatedAt: Date.now() };
      await service.saveDocument('chat_sessions', doc as any);

      const userKey = localStorage.getItem('firestore_user-abc_chat_sessions');
      expect(userKey).toBeTruthy();
    });

    it('should use an anonymous-keyed path for unauthenticated users', async () => {
      userId.value = null;
      const doc = { id: 'chat-anon', updatedAt: Date.now() };
      await service.saveDocument('chat_sessions', doc as any);

      const anonKey = localStorage.getItem('firestore_anonymous_chat_sessions');
      expect(anonKey).toBeTruthy();
    });
  });

  // ── getDocuments (local fallback) ─────────────────────────────────────────

  describe('getDocuments', () => {
    it('should return empty array when nothing saved', async () => {
      const docs = await service.getDocuments('empty_collection');
      expect(docs).toEqual([]);
    });

    it('should return previously saved documents', async () => {
      const doc = { id: 'g-1', name: 'Stored', updatedAt: Date.now() };
      await service.saveDocument('profiles', doc as any);

      const docs = await service.getDocuments('profiles');
      expect(docs.some((d: any) => d.id === 'g-1')).toBeTrue();
    });
  });

  // ── getDocument (single) ──────────────────────────────────────────────────

  describe('getDocument', () => {
    it('should return null for a missing document', async () => {
      const result = await service.getDocument('profiles', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return the document by id', async () => {
      const doc = { id: 'single-1', data: 'hello', updatedAt: Date.now() };
      await service.saveDocument('profiles', doc as any);

      const result = (await service.getDocument('profiles', 'single-1')) as any;
      expect(result?.data).toBe('hello');
    });
  });

  // ── deleteDocument ────────────────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('should remove the document from localStorage', async () => {
      const doc = { id: 'del-1', updatedAt: Date.now() };
      await service.saveDocument('items', doc as any);
      await service.deleteDocument('items', 'del-1');

      const docs = await service.getDocuments('items');
      expect(docs.some((d: any) => d.id === 'del-1')).toBeFalse();
    });

    it('should not throw when deleting a document that does not exist', async () => {
      await expectAsync(
        service.deleteDocument('items', 'phantom'),
      ).toBeResolved();
    });
  });

  // ── getLocalData ──────────────────────────────────────────────────────────

  describe('getLocalData', () => {
    it('should return data directly from localStorage without Firestore', async () => {
      const doc = { id: 'local-direct', updatedAt: Date.now() };
      await service.saveDocument('col', doc as any);

      const result = service.getLocalData<typeof doc>('col');
      expect(result.some((d) => d.id === 'local-direct')).toBeTrue();
    });
  });

  // ── SYNC-004: namespace assertions ────────────────────────────────────────

  describe('SYNC-004 — dedicated Firestore database isolation (structural)', () => {
    it('should construct user-specific localStorage key correctly', async () => {
      userId.value = 'uid-xyz';
      const doc = { id: 'ns-test', updatedAt: Date.now() };
      await service.saveDocument('chat_sessions', doc as any);

      // The localStorage key uses uid; Firestore isolation is handled by database selection.
      // The Firestore path is exercised in integration — here we verify the
      // local key isolation which guards against cross-user data leakage.
      const keyForUser = localStorage.getItem(
        'firestore_uid-xyz_chat_sessions',
      );
      const keyForAnon = localStorage.getItem(
        'firestore_anonymous_chat_sessions',
      );
      expect(keyForUser).toBeTruthy();
      expect(keyForAnon).toBeNull();
    });

    it('should isolate data between different user ids', async () => {
      userId.value = 'user-1';
      await service.saveDocument('profiles', { id: 'p1', updatedAt: 1 } as any);

      userId.value = 'user-2';
      const user2Docs = service.getLocalData('profiles');
      expect(user2Docs.some((d: any) => d.id === 'p1')).toBeFalse();
    });
  });
});
