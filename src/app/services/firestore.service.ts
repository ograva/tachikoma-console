import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
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

export interface SyncableData {
  id: string;
  updatedAt: number;
  [key: string]: any;
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

  constructor() {
    try {
      this.firestore = inject(Firestore);
      this.firestoreConfigured = true;
      this.enableOfflineSupport();
    } catch (error) {
      console.warn('Firestore not configured. Cloud storage features will be disabled.');
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
      const docRef = doc(
        this.firestore,
        `users/${userId}/${collectionName}`,
        data.id
      );
      await setDoc(docRef, { ...data, userId });
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      // Data is still in localStorage, so user won't lose it
      throw error;
    }
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

      // Update localStorage with Firestore data
      this.storeInLocalStorage(collectionName, data);

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
      const docRef = doc(
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
      const docRef = doc(
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
   * Sync localStorage with Firestore on login
   * Merges local data with cloud data, preferring newer versions
   */
  async syncOnLogin(): Promise<void> {
    // Skip if Firestore not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    console.log('Starting sync on login...');

    // Sync each collection
    const collections = ['chat_sessions', 'user_profile', 'agent_profiles'];

    for (const collectionName of collections) {
      await this.syncCollection(collectionName);
    }

    console.log('Sync completed');
  }

  /**
   * Sync a specific collection between localStorage and Firestore
   */
  private async syncCollection(collectionName: string): Promise<void> {
    // Skip if Firestore not configured
    if (!this.firestore || !this.firestoreConfigured) {
      return;
    }

    const userId = this.authService.getCurrentUserId();
    if (!userId) return;

    try {
      // Get localStorage data (from anonymous storage key)
      const anonymousKey = `firestore_anonymous_${collectionName}`;
      const anonymousDataStr = localStorage.getItem(anonymousKey);
      const anonymousData: SyncableData[] = anonymousDataStr
        ? JSON.parse(anonymousDataStr)
        : [];

      // Get Firestore data
      const collRef = collection(
        this.firestore,
        `users/${userId}/${collectionName}`
      );
      const snapshot = await getDocs(collRef);
      const firestoreData = new Map<string, SyncableData>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data() as SyncableData;
        firestoreData.set(data.id, data);
      });

      // Merge: prefer newer versions based on updatedAt
      const merged = new Map<string, SyncableData>();

      // Add all Firestore data
      firestoreData.forEach((data, id) => {
        merged.set(id, data);
      });

      // Merge anonymous local data
      for (const localItem of anonymousData) {
        const existing = merged.get(localItem.id);
        if (!existing || localItem.updatedAt > existing.updatedAt) {
          merged.set(localItem.id, localItem);
        }
      }

      // Save merged data back to Firestore and localStorage
      const batch = writeBatch(this.firestore);
      const mergedArray = Array.from(merged.values());

      for (const item of mergedArray) {
        const docRef = doc(
          this.firestore,
          `users/${userId}/${collectionName}`,
          item.id
        );
        batch.set(docRef, { ...item, userId });
      }

      await batch.commit();

      // Update localStorage with merged data
      this.storeInLocalStorage(collectionName, mergedArray);

      // Clear anonymous data after successful sync
      localStorage.removeItem(anonymousKey);

      console.log(`Synced ${collectionName}: ${mergedArray.length} items`);
    } catch (error) {
      console.error(`Error syncing ${collectionName}:`, error);
    }
  }

  /**
   * Get data directly from localStorage (for offline/immediate access)
   */
  getLocalData<T extends SyncableData>(collectionName: string): T[] {
    return this.getFromLocalStorage<T>(collectionName);
  }
}
