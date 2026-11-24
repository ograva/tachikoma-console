import { TestBed } from '@angular/core/testing';
import {
  FirestoreService,
  SyncTarget,
  planCollectionSync,
} from './firestore.service';
import { SyncableData } from '../models';
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

  // ── SYNC-002: login sync strategies ─────────────────────────────────────────

  describe('planCollectionSync (SYNC-002)', () => {
    const rec = (id: string, updatedAt: number, extra: object = {}) =>
      ({ id, updatedAt, ...extra }) as SyncableData;

    it('cloud-to-local: local becomes the cloud copy and nothing is written to the cloud', () => {
      const plan = planCollectionSync('cloud-to-local', [rec('l', 1)], [rec('c', 1)], { allowDeletes: true });
      expect(plan.local.map((r) => r.id)).toEqual(['c']);
      expect(plan.upserts).toEqual([]);
      expect(plan.deletes).toEqual([]);
    });

    it('cloud-to-local on a single-document collection keeps the local record when the cloud has none', () => {
      const plan = planCollectionSync('cloud-to-local', [rec('uid', 1)], [], { allowDeletes: false });
      expect(plan.local.map((r) => r.id)).toEqual(['uid']);
    });

    it('local-to-cloud: uploads local and deletes cloud-only docs when deletes are allowed', () => {
      const plan = planCollectionSync('local-to-cloud', [rec('a', 1)], [rec('a', 5), rec('b', 1)], { allowDeletes: true });
      expect(plan.local.map((r) => r.id)).toEqual(['a']);
      expect(plan.upserts.map((r) => r.id)).toEqual(['a']);
      expect(plan.deletes).toEqual(['b']);
    });

    it('local-to-cloud never deletes on a single-document collection', () => {
      const plan = planCollectionSync('local-to-cloud', [], [rec('uid', 1)], { allowDeletes: false });
      expect(plan.deletes).toEqual([]);
    });

    it('merge: union by id, newer updatedAt wins, only local winners are uploaded', () => {
      const plan = planCollectionSync(
        'merge',
        [rec('shared', 10, { v: 'local-old' }), rec('localOnly', 1), rec('localNewer', 9, { v: 'local' })],
        [rec('shared', 20, { v: 'cloud-new' }), rec('cloudOnly', 1), rec('localNewer', 3, { v: 'cloud' })],
        { allowDeletes: true },
      );
      const byId = new Map(plan.local.map((r) => [r.id, r]));
      expect([...byId.keys()].sort()).toEqual(['cloudOnly', 'localNewer', 'localOnly', 'shared']);
      expect(byId.get('shared')!['v']).toBe('cloud-new');
      expect(byId.get('localNewer')!['v']).toBe('local');
      expect(plan.upserts.map((r) => r.id).sort()).toEqual(['localNewer', 'localOnly']);
      expect(plan.deletes).toEqual([]);
    });

    it('merge: the cloud wins a tie', () => {
      const plan = planCollectionSync('merge', [rec('x', 5, { v: 'local' })], [rec('x', 5, { v: 'cloud' })], { allowDeletes: true });
      expect(plan.local[0]['v']).toBe('cloud');
      expect(plan.upserts).toEqual([]);
    });
  });

  describe('syncOnLogin (SYNC-002)', () => {
    let cloud: Record<string, SyncableData[]>;
    let commits: { collection: string; upserts: SyncableData[]; deletes: string[] }[];

    function makeTarget(local: SyncableData[] | null): jasmine.SpyObj<SyncTarget> {
      const target = jasmine.createSpyObj<SyncTarget>('SyncTarget', ['getLocalSyncData', 'applySyncResult']);
      target.getLocalSyncData.and.returnValue(local);
      return target;
    }

    beforeEach(() => {
      userId.value = 'uid-1';
      cloud = {};
      commits = [];
      // Pretend Firestore is configured; stub the two I/O seams.
      (service as any).firestore = {};
      (service as any).firestoreConfigured = true;
      spyOn(service as any, 'readCloudCollection').and.callFake(
        async (name: string) => cloud[name] ?? [],
      );
      spyOn(service as any, 'commitCloudChanges').and.callFake(
        async (name: string, _uid: string, upserts: SyncableData[], deletes: string[]) => {
          commits.push({ collection: name, upserts, deletes });
        },
      );
    });

    it('local-to-cloud never deletes the cloud user_profile (single document)', async () => {
      cloud['user_profile'] = [{ id: 'uid-1', updatedAt: 1, geminiApiKeyEncrypted: 'enc' } as SyncableData];
      const profile = makeTarget([{ id: 'anonymous', updatedAt: 2, chatUsername: 'MAJOR' } as SyncableData]);

      await service.syncOnLogin('local-to-cloud', { user_profile: profile });

      const commit = commits.find((c) => c.collection === 'user_profile')!;
      expect(commit.deletes).toEqual([]);
      expect(commit.upserts.length).toBe(1);
      expect(commit.upserts[0].id).toBe('uid-1'); // re-keyed to the user's document id
      expect(profile.applySyncResult).toHaveBeenCalled();
    });

    it('local-to-cloud keeps cloud-only user_profile fields such as the encrypted API key', async () => {
      cloud['user_profile'] = [{ id: 'uid-1', updatedAt: 1, geminiApiKeyEncrypted: 'enc', rateLimitRPM: 1000 } as SyncableData];
      const profile = makeTarget([{ id: 'uid-1', updatedAt: 2, chatUsername: 'MAJOR' } as SyncableData]);

      await service.syncOnLogin('local-to-cloud', { user_profile: profile });

      const [upload] = commits.find((c) => c.collection === 'user_profile')!.upserts;
      expect(upload).toEqual(jasmine.objectContaining({ id: 'uid-1', chatUsername: 'MAJOR', geminiApiKeyEncrypted: 'enc', rateLimitRPM: 1000 }));
    });

    it('skips a collection whose local copy is unreadable: no cloud write, no delete, no local change', async () => {
      cloud['user_profile'] = [{ id: 'uid-1', updatedAt: 1 } as SyncableData];
      cloud['chat_sessions'] = [{ id: 'chat-1', updatedAt: 1 } as SyncableData];
      const profile = makeTarget(null);

      await service.syncOnLogin('local-to-cloud', { user_profile: profile });

      expect(commits).toEqual([]);
      expect(profile.applySyncResult).not.toHaveBeenCalled();
    });

    it('cloud-to-local applies the cloud copy to the owning service and writes nothing to the cloud', async () => {
      cloud['chat_sessions'] = [{ id: 'cloud-chat', updatedAt: 1 } as SyncableData];
      const chats = makeTarget([{ id: 'local-chat', updatedAt: 2 } as SyncableData]);

      await service.syncOnLogin('cloud-to-local', { chat_sessions: chats });

      expect(chats.applySyncResult).toHaveBeenCalledWith([jasmine.objectContaining({ id: 'cloud-chat' })]);
      expect(commits[0].upserts).toEqual([]);
      expect(commits[0].deletes).toEqual([]);
    });

    it('local-to-cloud replaces cloud chats with the local ones', async () => {
      cloud['chat_sessions'] = [{ id: 'cloud-chat', updatedAt: 1 } as SyncableData];
      const chats = makeTarget([{ id: 'local-chat', updatedAt: 2 } as SyncableData]);

      await service.syncOnLogin('local-to-cloud', { chat_sessions: chats });

      expect(commits[0].upserts.map((u) => u.id)).toEqual(['local-chat']);
      expect(commits[0].deletes).toEqual(['cloud-chat']);
      expect(chats.applySyncResult).toHaveBeenCalledWith([jasmine.objectContaining({ id: 'local-chat' })]);
    });

    it('uses toCloud/fromCloud transforms (e.g. encrypt on upload, decrypt on download)', async () => {
      cloud['user_profile'] = [{ id: 'uid-1', updatedAt: 1, secret: 'cipher' } as SyncableData];
      const profile = makeTarget([{ id: 'uid-1', updatedAt: 5, secret: 'plain' } as SyncableData]);
      profile.toCloud = jasmine.createSpy('toCloud').and.callFake(async (i: SyncableData) => ({ ...i, secret: 'cipher2' }));
      profile.fromCloud = jasmine.createSpy('fromCloud').and.callFake(async (i: SyncableData) => ({ ...i, secret: 'plain-from-cloud' }));

      await service.syncOnLogin('merge', { user_profile: profile });

      expect(profile.fromCloud).toHaveBeenCalled();
      expect(commits[0].upserts[0]['secret']).toBe('cipher2');
      expect(profile.applySyncResult).toHaveBeenCalledWith([jasmine.objectContaining({ secret: 'plain' })]);
    });

    it('does nothing without a signed-in user', async () => {
      userId.value = null;
      const chats = makeTarget([]);
      await service.syncOnLogin('local-to-cloud', { chat_sessions: chats });
      expect(commits).toEqual([]);
      expect(chats.getLocalSyncData).not.toHaveBeenCalled();
    });

    it('a failing collection does not stop the others', async () => {
      (service as any).readCloudCollection.and.callFake(async (name: string) => {
        if (name === 'chat_sessions') throw new Error('boom');
        return [];
      });
      const chats = makeTarget([]);
      const agents = makeTarget([{ id: 'a', updatedAt: 1 } as SyncableData]);

      await service.syncOnLogin('merge', { chat_sessions: chats, agent_profiles: agents });

      expect(chats.applySyncResult).not.toHaveBeenCalled();
      expect(agents.applySyncResult).toHaveBeenCalled();
    });
  });
});
