import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc as firestoreDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  enableIndexedDbPersistence,
  writeBatch,
} from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { SyncableData } from '../models';

export type SyncStrategyName = 'merge' | 'cloud-to-local' | 'local-to-cloud';

/** Collections synced on login, in order. */
export const SYNC_COLLECTIONS = [
  'chat_sessions',
  'user_profile',
  'agent_profiles',
] as const;
export type SyncCollectionName = (typeof SYNC_COLLECTIONS)[number];

/** Collections holding exactly one document (id = user id); never bulk-deleted. */
export const SINGLE_DOCUMENT_COLLECTIONS: ReadonlySet<string> = new Set([
  'user_profile',
]);

/**
 * A service that owns a synced collection's local state (localStorage key and
 * signal). FirestoreService reads from and writes back to it during login sync.
 */
export interface SyncTarget<T extends SyncableData = SyncableData> {
  /** The records the app currently holds; `null` when the local copy is unreadable. */
  getLocalSyncData(): T[] | null;
  /** Replace the local state (signal + localStorage) with the sync result. */
  applySyncResult(items: SyncableData[]): void | Promise<void>;
  /** Convert a local record for upload (e.g. encrypt secrets). */
  toCloud?(item: SyncableData): SyncableData | Promise<SyncableData>;
  /** Convert a cloud record into its local shape (e.g. decrypt secrets). */
  fromCloud?(item: SyncableData): SyncableData | Promise<SyncableData>;
  /**
   * True when a local record carries no user data and must lose to its cloud
   * version whatever its `updatedAt` (e.g. an untouched default agent stamped
   * with boot time). See `mergeSyncRecords`.
   */
  yieldsToCloud?(item: SyncableData): boolean;
}

export type SyncTargets = Partial<Record<SyncCollectionName, SyncTarget>>;

export interface SyncPlan {
  /** What local state should become. */
  local: SyncableData[];
  /** Records to write to the cloud. */
  upserts: SyncableData[];
  /** Cloud document ids to delete. */
  deletes: string[];
}

export interface MergeSyncOptions<T extends SyncableData> {
  /** Local records for which this returns true always lose to their cloud version. */
  yieldsToCloud?: (local: T) => boolean;
}

export interface MergeSyncResult<T extends SyncableData> {
  /** The union by id: local order first, then cloud-only records. */
  merged: T[];
  /** Cloud records that changed the local state (new, newer, or a differing tie). */
  fromCloud: number;
  /** Local records that won (local-only or strictly newer): the ones to upload. */
  localWinners: T[];
}

/**
 * True when the cloud copy of a record held on both sides must be kept.
 *
 * The single conflict rule for every merge path, so the login "merge"
 * strategy (`planCollectionSync`) and the post-sign-in restores
 * (`ChatStorageService.mergeByUpdatedAt`, `AgentProfileService.loadFromCloud`)
 * cannot drift apart:
 * 1. A local record that `yieldsToCloud` (an untouched default agent) loses.
 * 2. Otherwise the newer `updatedAt` wins (a missing timestamp counts as 0).
 * 3. Tie-break: on equal `updatedAt` the CLOUD copy wins. The cloud is the
 *    copy every device converges on, so a tie never triggers an upload and
 *    two devices that tie both settle on the same version.
 */
export function cloudCopyWins<T extends SyncableData>(
  local: T,
  cloud: T,
  yieldsToCloud?: (local: T) => boolean,
): boolean {
  if (yieldsToCloud?.(local)) return true;
  return (cloud.updatedAt ?? 0) >= (local.updatedAt ?? 0);
}

/** JSON with object keys sorted, for an order-independent content comparison. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

/**
 * Merge cloud records into local records by id with `cloudCopyWins`. Records
 * held on one side only are kept. Pure; shared by every merge path.
 */
export function mergeSyncRecords<T extends SyncableData>(
  local: T[],
  cloud: T[],
  options: MergeSyncOptions<T> = {},
): MergeSyncResult<T> {
  const merged = new Map<string, T>();
  local.forEach((item) => merged.set(item.id, item));
  const localWinnerIds = new Set(local.map((item) => item.id));
  let fromCloud = 0;
  for (const item of cloud) {
    const existing = merged.get(item.id);
    if (!existing) {
      merged.set(item.id, item);
      fromCloud++;
      continue;
    }
    if (!cloudCopyWins(existing, item, options.yieldsToCloud)) continue;
    localWinnerIds.delete(item.id);
    const tie = (item.updatedAt ?? 0) === (existing.updatedAt ?? 0);
    if (!tie || stableStringify(existing) !== stableStringify(item)) {
      fromCloud++;
    }
    merged.set(item.id, item);
  }
  return {
    merged: Array.from(merged.values()),
    fromCloud,
    localWinners: local.filter((item) => localWinnerIds.has(item.id)),
  };
}

/**
 * Pure strategy resolution for one collection.
 * - cloud-to-local: local becomes the cloud copy; the cloud is not written.
 *   With `allowDeletes` false (single-document collections) an empty cloud
 *   keeps the local record instead of erasing it.
 * - local-to-cloud: the cloud becomes the local copy. Cloud-only documents are
 *   deleted only when `allowDeletes` is true.
 * - merge: union by id with the shared conflict rule (`cloudCopyWins`: the
 *   newer `updatedAt` wins, the cloud wins ties, and a local record that
 *   `yieldsToCloud` always loses). Only records where the local version won
 *   are uploaded.
 */
export function planCollectionSync(
  strategy: SyncStrategyName,
  local: SyncableData[],
  cloud: SyncableData[],
  options: {
    allowDeletes: boolean;
    yieldsToCloud?: (local: SyncableData) => boolean;
  },
): SyncPlan {
  switch (strategy) {
    case 'cloud-to-local':
      return {
        local: cloud.length > 0 || options.allowDeletes ? [...cloud] : [...local],
        upserts: [],
        deletes: [],
      };

    case 'local-to-cloud': {
      const localIds = new Set(local.map((item) => item.id));
      return {
        local: [...local],
        upserts: [...local],
        deletes: options.allowDeletes
          ? cloud.map((item) => item.id).filter((id) => !localIds.has(id))
          : [],
      };
    }

    case 'merge':
    default: {
      const { merged, localWinners } = mergeSyncRecords(local, cloud, {
        yieldsToCloud: options.yieldsToCloud,
      });
      return { local: merged, upserts: localWinners, deletes: [] };
    }
  }
}

/**
 * FirestoreService implements a store-forward pattern:
 * 1. Store in localStorage first for immediate access
 * 2. Forward to Firestore for cloud persistence
 * 3. When retrieving, fetch from Firestore and update localStorage
 * 4. Enable offline caching for Firestore
 */
@Injectable({
  providedIn: 'root',
})
export class FirestoreService {
  private firestore: Firestore | null = null;
  private authService = inject(AuthService);
  private offlineEnabled = false;
  private firestoreConfigured = false;

  private getUserCollectionPath(
    userId: string,
    collectionName: string,
  ): string {
    return `users/${userId}/${collectionName}`;
  }

  constructor() {
    try {
      this.firestore = inject(Firestore);
      this.firestoreConfigured = true;
      this.enableOfflineSupport();
    } catch (error) {
      console.warn(
        'Firestore not configured. Cloud storage features will be disabled.',
      );
      this.firestoreConfigured = false;
    }
  }

  /**
   * Check if Firestore is properly configured
   */
  isFirestoreConfigured(): boolean {
    return this.firestoreConfigured;
  }

  /**
   * Enable Firestore offline persistence
   */
  private async enableOfflineSupport(): Promise<void> {
    if (this.offlineEnabled || !this.firestore) return;

    try {
      await enableIndexedDbPersistence(this.firestore);
      this.offlineEnabled = true;
      console.log('Firestore offline persistence enabled');
    } catch (error: any) {
      if (error.code === 'failed-precondition') {
        console.warn(
          'Multiple tabs open, offline persistence only works in one tab at a time.',
        );
      } else if (error.code === 'unimplemented') {
        console.warn(
          'The current browser does not support offline persistence.',
        );
      } else {
        console.error('Error enabling offline persistence:', error);
      }
    }
  }

  /**
   * Get localStorage key for a collection
   */
  private getLocalStorageKey(collectionName: string): string {
    const userId = this.authService.getCurrentUserId();
    return userId
      ? `firestore_${userId}_${collectionName}`
      : `firestore_anonymous_${collectionName}`;
  }

  /**
   * Store data in localStorage
   */
  private storeInLocalStorage<T extends SyncableData>(
    collectionName: string,
    data: T[],
  ): void {
    const key = this.getLocalStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Get data from localStorage
   */
  private getFromLocalStorage<T extends SyncableData>(
    collectionName: string,
  ): T[] {
    const key = this.getLocalStorageKey(collectionName);
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing localStorage data:', e);
        return [];
      }
    }
    return [];
  }

  /**
   * Store-Forward: Save a document
   * 1. Update localStorage immediately
   * 2. Forward to Firestore
   */
  async saveDocument<T extends SyncableData>(
    collectionName: string,
    data: T,
  ): Promise<void> {
    // 1. Update localStorage first for immediate access
    this.updateLocalStorageDocument(collectionName, data);

    // Skip Firestore if not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      // Just store in localStorage for anonymous users
      return;
    }

    // 2. Forward to Firestore
    try {
      const path = this.getUserCollectionPath(userId, collectionName);
      const docRef = firestoreDoc(this.firestore, path, data.id);

      // Sanitize data: Remove undefined fields (Firestore doesn't allow undefined)
      const sanitizedData = this.sanitizeForFirestore({
        ...data,
        userId,
      }) as any;
      await setDoc(docRef, sanitizedData);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      // Data is still in localStorage, so user won't lose it
      throw error;
    }
  }

  /**
   * Sanitize data for Firestore (DAT-302: never write `null` or `undefined`).
   * `null` and `undefined` fields are omitted, and `null`/`undefined` array
   * items are dropped. Every write is a full `setDoc`/`batch.set`, so omitting
   * a field clears it just as writing `null` would.
   */
  private sanitizeForFirestore<T>(data: T): Partial<T> {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(data as any)) {
      if (value === undefined || value === null) {
        // Skip null/undefined fields entirely
        continue;
      }

      if (Array.isArray(value)) {
        // Drop null/undefined items; recursively sanitize object items
        sanitized[key] = value
          .filter((item) => item !== undefined && item !== null)
          .map((item) =>
            typeof item === 'object' ? this.sanitizeForFirestore(item) : item,
          );
      } else if (typeof value === 'object') {
        // Recursively sanitize nested objects
        const sanitizedNested = this.sanitizeForFirestore(value);
        // Only include if sanitized object has properties
        if (Object.keys(sanitizedNested).length > 0) {
          sanitized[key] = sanitizedNested;
        }
      } else {
        // Primitive values are safe
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Update a single document in localStorage
   */
  private updateLocalStorageDocument<T extends SyncableData>(
    collectionName: string,
    data: T,
  ): void {
    const existing = this.getFromLocalStorage<T>(collectionName);
    const index = existing.findIndex((item) => item.id === data.id);

    if (index >= 0) {
      existing[index] = data;
    } else {
      existing.push(data);
    }

    this.storeInLocalStorage(collectionName, existing);
  }

  /**
   * Get all documents from a collection
   * Retrieves from Firestore and updates localStorage
   */
  async getDocuments<T extends SyncableData>(
    collectionName: string,
  ): Promise<T[]> {
    // If Firestore not configured, return localStorage data
    if (!this.firestore || !this.firestoreConfigured) {
      return this.getFromLocalStorage<T>(collectionName);
    }

    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      // Return localStorage data for anonymous users
      return this.getFromLocalStorage<T>(collectionName);
    }

    try {
      const path = this.getUserCollectionPath(userId, collectionName);
      const collRef = collection(this.firestore, path);
      const snapshot = await getDocs(collRef);
      const data = snapshot.docs.map((doc) => doc.data() as T);

      // Return data without updating localStorage
      // Service layer (ChatStorageService, AgentProfileService) handles merging
      return data;
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      // Fall back to localStorage
      return this.getFromLocalStorage<T>(collectionName);
    }
  }

  /**
   * Get a single document
   */
  async getDocument<T extends SyncableData>(
    collectionName: string,
    documentId: string,
  ): Promise<T | null> {
    // If Firestore not configured, return localStorage data
    if (!this.firestore || !this.firestoreConfigured) {
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.find((item) => item.id === documentId) || null;
    }

    const userId = this.authService.getCurrentUserId();

    if (!userId) {
      // Check localStorage for anonymous users
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.find((item) => item.id === documentId) || null;
    }

    try {
      const path = this.getUserCollectionPath(userId, collectionName);
      const docRef = firestoreDoc(this.firestore, path, documentId);
      const snapshot = await getDoc(docRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as T;
        // Update this document in localStorage
        this.updateLocalStorageDocument(collectionName, data);
        return data;
      }

      return null;
    } catch (error) {
      console.error('Error fetching document from Firestore:', error);
      // Fall back to localStorage
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.find((item) => item.id === documentId) || null;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(
    collectionName: string,
    documentId: string,
  ): Promise<void> {
    // Remove from localStorage
    const existing = this.getFromLocalStorage<SyncableData>(collectionName);
    const filtered = existing.filter((item) => item.id !== documentId);
    this.storeInLocalStorage(collectionName, filtered);

    // Skip Firestore if not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return;
    }

    // Delete from Firestore
    try {
      const path = this.getUserCollectionPath(userId, collectionName);
      const docRef = firestoreDoc(this.firestore, path, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw error;
    }
  }

  /**
   * Save multiple documents in a batch (for large chat sessions)
   */
  async saveBatch<T extends SyncableData>(
    collectionName: string,
    documents: T[],
  ): Promise<void> {
    // Update localStorage first
    documents.forEach((doc) => {
      this.updateLocalStorageDocument(collectionName, doc);
    });

    // Skip Firestore if not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      return;
    }

    try {
      const batch = writeBatch(this.firestore);
      const path = this.getUserCollectionPath(userId, collectionName);

      documents.forEach((item) => {
        const docRef = firestoreDoc(this.firestore!, path, item.id);
        batch.set(docRef, { ...item, userId });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error saving batch to Firestore:', error);
      throw error;
    }
  }

  /**
   * Get paginated documents for large collections
   */
  async getDocumentsPaginated<T extends SyncableData>(
    collectionName: string,
    documentIds: string[],
  ): Promise<T[]> {
    // If Firestore not configured, return localStorage data
    if (!this.firestore || !this.firestoreConfigured) {
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.filter((item) => documentIds.includes(item.id));
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.filter((item) => documentIds.includes(item.id));
    }

    try {
      const results: T[] = [];

      // Fetch in chunks of 10 (Firestore 'in' query limit)
      for (let i = 0; i < documentIds.length; i += 10) {
        const chunk = documentIds.slice(i, i + 10);
        const path = this.getUserCollectionPath(userId, collectionName);
        const collRef = collection(this.firestore, path);
        const q = query(collRef, where('id', 'in', chunk));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach((doc) => {
          results.push(doc.data() as T);
        });
      }

      return results;
    } catch (error) {
      console.error('Error fetching paginated documents:', error);
      const local = this.getFromLocalStorage<T>(collectionName);
      return local.filter((item) => documentIds.includes(item.id));
    }
  }

  /**
   * Sync the app's local state with Firestore on login, using the strategy the
   * user picked in the sync dialog.
   *
   * Each collection is read from, and written back to, the service that owns it
   * (`targets`), so the result lands in the `tachikoma_*` keys and the signals
   * the UI actually reads.
   */
  async syncOnLogin(
    strategy: SyncStrategyName,
    targets: SyncTargets,
  ): Promise<void> {
    // Skip if Firestore not configured
    if (!this.firestore || !this.firestoreConfigured) {
      console.warn('Firestore not configured, skipping sync');
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      console.warn('No user ID, skipping sync');
      return;
    }

    console.log(`Starting sync on login with strategy: ${strategy}`);

    for (const collectionName of SYNC_COLLECTIONS) {
      const target = targets[collectionName];
      if (!target) {
        console.warn(`No sync target for ${collectionName}, skipping`);
        continue;
      }
      try {
        await this.syncCollection(collectionName, strategy, target);
      } catch (error) {
        console.error(`Error syncing ${collectionName}:`, error);
      }
    }

    console.log('Sync completed');
  }

  /**
   * Sync one collection between the owning service's local state and Firestore.
   */
  private async syncCollection(
    collectionName: SyncCollectionName,
    strategy: SyncStrategyName,
    target: SyncTarget,
  ): Promise<void> {
    // Skip if Firestore not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    const singleDocument = SINGLE_DOCUMENT_COLLECTIONS.has(collectionName);

    // Local copy as the app holds it. `null` means it could not be read, so no
    // strategy may treat it as "empty" (that would delete cloud data).
    let local = target.getLocalSyncData();
    if (local === null) {
      console.warn(
        `${collectionName}: local copy unreadable, leaving cloud and local untouched`,
      );
      return;
    }
    if (singleDocument) {
      // The only valid document id is the user id (users/{uid}/user_profile/{uid}).
      local = local.slice(0, 1).map((item) => ({ ...item, id: userId }));
    }

    const rawCloud = await this.readCloudCollection(collectionName, userId);
    const cloud: SyncableData[] = [];
    for (const item of rawCloud) {
      if (singleDocument && item.id !== userId) continue;
      cloud.push(target.fromCloud ? await target.fromCloud(item) : item);
    }

    const plan = planCollectionSync(strategy, local, cloud, {
      allowDeletes: !singleDocument,
      yieldsToCloud: target.yieldsToCloud
        ? (item) => target.yieldsToCloud!(item)
        : undefined,
    });

    const upserts: SyncableData[] = [];
    for (const item of plan.upserts) {
      const upload = target.toCloud ? await target.toCloud(item) : item;
      // A single-document collection is updated, never replaced: fields only
      // the cloud holds (e.g. geminiApiKeyEncrypted) survive a local upload.
      const existing = singleDocument
        ? rawCloud.find((doc) => doc.id === userId)
        : undefined;
      upserts.push(existing ? { ...existing, ...upload } : upload);
    }
    await this.commitCloudChanges(collectionName, userId, upserts, plan.deletes);

    await target.applySyncResult(plan.local);

    console.log(
      `✓ Synced ${collectionName} (${strategy}): ${plan.local.length} local, ` +
        `${upserts.length} uploaded, ${plan.deletes.length} deleted in cloud`,
    );
  }

  /** Read every document of a user collection from Firestore. */
  private async readCloudCollection(
    collectionName: string,
    userId: string,
  ): Promise<SyncableData[]> {
    const path = this.getUserCollectionPath(userId, collectionName);
    const snapshot = await getDocs(collection(this.firestore!, path));
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as SyncableData;
      return { ...data, id: data.id || docSnap.id };
    });
  }

  /**
   * Write upserts and deletes to Firestore in batches (≤ 450 ops each, below
   * the 500-op limit). Every write is sanitized so no `undefined` reaches
   * Firestore.
   */
  private async commitCloudChanges(
    collectionName: string,
    userId: string,
    upserts: SyncableData[],
    deletes: string[],
  ): Promise<void> {
    const path = this.getUserCollectionPath(userId, collectionName);
    const ops: Array<(batch: ReturnType<typeof writeBatch>) => void> = [
      ...upserts.map((item) => (batch: ReturnType<typeof writeBatch>) => {
        const docRef = firestoreDoc(this.firestore!, path, item.id);
        batch.set(docRef, this.sanitizeForFirestore({ ...item, userId }) as any);
      }),
      ...deletes.map((id) => (batch: ReturnType<typeof writeBatch>) => {
        batch.delete(firestoreDoc(this.firestore!, path, id));
      }),
    ];

    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(this.firestore!);
      ops.slice(i, i + 450).forEach((op) => op(batch));
      await batch.commit();
    }
  }

  /**
   * Get data directly from localStorage (for offline/immediate access)
   */
  getLocalData<T extends SyncableData>(collectionName: string): T[] {
    return this.getFromLocalStorage<T>(collectionName);
  }
}
