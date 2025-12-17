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

  constructor() {
    try {
      this.firestore = inject(Firestore);
      this.firestoreConfigured = true;
      this.enableOfflineSupport();
    } catch (error) {
      console.warn(
        'Firestore not configured. Cloud storage features will be disabled.'
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
          'Multiple tabs open, offline persistence only works in one tab at a time.'
        );
      } else if (error.code === 'unimplemented') {
        console.warn(
          'The current browser does not support offline persistence.'
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
    data: T[]
  ): void {
    const key = this.getLocalStorageKey(collectionName);
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Get data from localStorage
   */
  private getFromLocalStorage<T extends SyncableData>(
    collectionName: string
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
    data: T
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
      const docRef = firestoreDoc(
        this.firestore,
        `users/${userId}/${collectionName}`,
        data.id
      );

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
   * Sanitize data for Firestore by removing undefined fields
   * Firestore doesn't allow undefined values - must be null or omitted
   */
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
        // Recursively sanitize array items (handle objects in arrays)
        sanitized[key] = value
          .map((item) => {
            if (item === undefined) {
              return null; // Convert undefined to null in arrays
            }
            if (typeof item === 'object' && item !== null) {
              return this.sanitizeForFirestore(item);
            }
            return item;
          })
          .filter((item) => item !== null || value.includes(null)); // Keep nulls only if original array had nulls
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
    data: T
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
    collectionName: string
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
      const collRef = collection(
        this.firestore,
        `users/${userId}/${collectionName}`
      );
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
    documentId: string
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
      const docRef = firestoreDoc(
        this.firestore,
        `users/${userId}/${collectionName}`,
        documentId
      );
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
    documentId: string
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
      const docRef = firestoreDoc(
        this.firestore,
        `users/${userId}/${collectionName}`,
        documentId
      );
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
    documents: T[]
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

      documents.forEach((item) => {
        const docRef = firestoreDoc(
          this.firestore!,
          `users/${userId}/${collectionName}`,
          item.id
        );
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
    documentIds: string[]
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
        const collRef = collection(
          this.firestore,
          `users/${userId}/${collectionName}`
        );
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
   * Sync localStorage with Firestore on login
   * User chooses to merge or overwrite
   */
  async syncOnLogin(
    strategy: 'merge' | 'cloud-to-local' | 'local-to-cloud'
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

    // Sync each collection
    const collections = ['chat_sessions', 'user_profile', 'agent_profiles'];

    for (const collectionName of collections) {
      try {
        await this.syncCollection(collectionName, strategy);
      } catch (error) {
        console.error(`Error syncing ${collectionName}:`, error);
      }
    }

    console.log('Sync completed');
  }

  /**
   * Sync a specific collection between localStorage and Firestore
   */
  private async syncCollection(
    collectionName: string,
    strategy: 'merge' | 'cloud-to-local' | 'local-to-cloud'
  ): Promise<void> {
    // Skip if Firestore not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    try {
      // Get localStorage data (anonymous user data)
      const anonymousKey = `tachikoma_${collectionName}`;
      const localKey = `tachikoma_${collectionName}`;

      // Check both possible keys
      const anonymousDataStr = localStorage.getItem(anonymousKey);
      const localDataStr = localStorage.getItem(localKey);

      let localData: SyncableData[] = [];

      if (anonymousDataStr) {
        try {
          const parsed = JSON.parse(anonymousDataStr);
          localData = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error(`Error parsing ${anonymousKey}:`, e);
        }
      } else if (localDataStr) {
        try {
          const parsed = JSON.parse(localDataStr);
          localData = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error(`Error parsing ${localKey}:`, e);
        }
      }

      // Get Firestore data
      const collRef = collection(
        this.firestore,
        `users/${userId}/${collectionName}`
      );
      const snapshot = await getDocs(collRef);
      const firestoreData = new Map<string, SyncableData>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as SyncableData;
        firestoreData.set(data.id, data);
      });

      let finalData: SyncableData[] = [];

      // Apply sync strategy
      switch (strategy) {
        case 'cloud-to-local':
          // Overwrite local with cloud data
          finalData = Array.from(firestoreData.values());
          console.log(
            `${collectionName}: Overwriting local with ${finalData.length} cloud items`
          );
          break;

        case 'local-to-cloud':
          // Overwrite cloud with local data
          finalData = localData;
          console.log(
            `${collectionName}: Overwriting cloud with ${finalData.length} local items`
          );

          // Delete all existing cloud documents
          const deleteBatch = writeBatch(this.firestore);
          firestoreData.forEach((_, id) => {
            const docRef = firestoreDoc(
              this.firestore!,
              `users/${userId}/${collectionName}`,
              id
            );
            deleteBatch.delete(docRef);
          });
          await deleteBatch.commit();
          break;

        case 'merge':
        default:
          // Merge: prefer newer versions based on updatedAt
          const merged = new Map<string, SyncableData>();

          // Add all Firestore data
          firestoreData.forEach((data, id) => {
            merged.set(id, data);
          });

          // Merge local data (prefer newer)
          for (const localItem of localData) {
            const existing = merged.get(localItem.id);
            if (!existing || localItem.updatedAt > existing.updatedAt) {
              merged.set(localItem.id, localItem);
            }
          }

          finalData = Array.from(merged.values());
          console.log(`${collectionName}: Merged to ${finalData.length} items`);
          break;
      }

      // Save final data to Firestore
      if (finalData.length > 0) {
        const batch = writeBatch(this.firestore);

        for (const item of finalData) {
          const docRef = firestoreDoc(
            this.firestore,
            `users/${userId}/${collectionName}`,
            item.id
          );
          batch.set(docRef, { ...item, userId });
        }

        await batch.commit();
      }

      // Update localStorage with final data
      this.storeInLocalStorage(collectionName, finalData);

      // Clear old anonymous keys
      localStorage.removeItem(anonymousKey);
      if (anonymousKey !== localKey) {
        localStorage.removeItem(localKey);
      }

      console.log(`✓ Synced ${collectionName}: ${finalData.length} items`);
    } catch (error) {
      console.error(`✗ Error syncing ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get data directly from localStorage (for offline/immediate access)
   */
  getLocalData<T extends SyncableData>(collectionName: string): T[] {
    return this.getFromLocalStorage<T>(collectionName);
  }
}
