import { Injectable, signal, inject } from '@angular/core';
import { FirestoreService } from './firestore.service';
import { AuthService } from './auth.service';
import { AgentProfile, AgentProfileModel } from '../models';

export { AgentProfile };

@Injectable({
  providedIn: 'root',
})
export class AgentProfileService {
  private readonly STORAGE_KEY = 'tachikoma_agent_profiles';
  private readonly COLLECTION_NAME = 'agent_profiles';
  private profilesSignal = signal<AgentProfile[]>([]);

  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

  constructor() {
    this.loadProfiles();
  }

  private getDefaultProfiles(): AgentProfile[] {
    return AgentProfileModel.getDefaults();
  }

  private loadProfiles(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const profiles = JSON.parse(stored);
        const normalizedProfiles = profiles.map((p: any) =>
          AgentProfileModel.fromLocalStorage(p)
        );
        this.profilesSignal.set(normalizedProfiles);
      } catch (e) {
        console.error('Error loading profiles, using defaults:', e);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  private saveProfiles(): void {
    localStorage.setItem(
      this.STORAGE_KEY,
      JSON.stringify(this.profilesSignal())
    );
  }

  private async syncToCloud(): Promise<void> {
    if (!this.authService.isRealUser()) {
      console.log(
        '💾 Agent profiles saved locally (not syncing - user not authenticated)'
      );
      return;
    }

    console.log('☁️ Syncing agent profiles to Firestore...');
    const profiles = this.profilesSignal();
    for (const profile of profiles) {
      try {
        await this.firestoreService.saveDocument(this.COLLECTION_NAME, profile);
      } catch (error) {
        console.error(
          `❌ Error syncing agent profile ${profile.id} to cloud:`,
          error
        );
      }
    }
    console.log(`✅ Synced ${profiles.length} agent profiles to Firestore`);
  }

  getProfiles(): AgentProfile[] {
    return this.profilesSignal();
  }

  getChatters(): AgentProfile[] {
    return this.profilesSignal().filter((p) => p.role === 'chatter');
  }

  getModerators(): AgentProfile[] {
    return this.profilesSignal().filter((p) => p.role === 'moderator');
  }

  async addProfile(
    profile: Omit<AgentProfile, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    const now = Date.now();
    const newProfile = {
      ...profile,
      id: this.generateId(),
      status: 'idle' as const,
      createdAt: now,
      updatedAt: now,
    } as AgentProfile;

    // Update local state immediately
    this.profilesSignal.update((profiles) => [...profiles, newProfile]);
    this.saveProfiles();

    // Sync to cloud
    await this.syncToCloud();
  }

  async updateProfile(
    id: string,
    updates: Partial<AgentProfile>
  ): Promise<void> {
    const now = Date.now();

    // Update local state immediately
    this.profilesSignal.update((profiles) =>
      profiles.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: now } : p
      )
    );
    this.saveProfiles();

    // Sync to cloud
    await this.syncToCloud();
  }

  async deleteProfile(id: string): Promise<void> {
    // Update local state immediately
    this.profilesSignal.update((profiles) =>
      profiles.filter((p) => p.id !== id)
    );
    this.saveProfiles();

    // Delete from cloud
    if (this.authService.isRealUser()) {
      try {
        await this.firestoreService.deleteDocument(this.COLLECTION_NAME, id);
        console.log(`🗑️ Agent profile ${id} deleted from Firestore`);
      } catch (error) {
        console.error(
          `❌ Error deleting agent profile ${id} from cloud:`,
          error
        );
      }
    }
  }

  resetToDefaults(): void {
    this.profilesSignal.set(this.getDefaultProfiles());
    this.saveProfiles();
    // Sync defaults to cloud
    this.syncToCloud();
  }

  /**
   * Load profiles from Firestore (called after login sync)
   * Merges cloud data with existing localStorage data
   */
  async loadFromCloud(): Promise<void> {
    if (!this.authService.isRealUser()) {
      return;
    }

    console.log('📥 Loading agent profiles from Firestore...');
    try {
      const profiles = await this.firestoreService.getDocuments<AgentProfile>(
        this.COLLECTION_NAME
      );

      if (profiles.length > 0) {
        // Normalize profiles using model
        const normalizedProfiles = profiles.map((p) =>
          AgentProfileModel.fromFirestore(p)
        );

        // Merge with existing localStorage data instead of replacing
        const existingProfiles = this.profilesSignal();
        const existingProfileIds = new Set(existingProfiles.map((p) => p.id));

        // Add only profiles that don't exist locally
        const newProfiles = normalizedProfiles.filter(
          (profile) => !existingProfileIds.has(profile.id)
        );

        if (newProfiles.length > 0) {
          this.profilesSignal.update((profiles) => [
            ...profiles,
            ...newProfiles,
          ]);
          this.saveProfiles();
          console.log(
            `✅ Merged ${newProfiles.length} new agent profiles from Firestore (${profiles.length} total in cloud)`
          );
        } else {
          console.log(
            `✅ All ${profiles.length} Firestore agent profiles already exist locally`
          );
        }
      } else {
        console.log('📭 No agent profiles found in Firestore');
      }
    } catch (error) {
      console.error('❌ Error loading agent profiles from cloud:', error);
    }
  }

  /**
   * Manual sync all local agent profiles to Firestore
   * Handles legacy agent structures by migrating them
   */
  async manualSyncAllProfilesToCloud(): Promise<{
    success: number;
    failed: number;
  }> {
    if (!this.authService.isRealUser()) {
      console.log('❌ Cannot sync - user not authenticated');
      return { success: 0, failed: 0 };
    }

    console.log(
      '🔄 Starting manual sync of all agent profiles to Firestore...'
    );
    const profiles = this.profilesSignal();
    let success = 0;
    let failed = 0;

    for (const profile of profiles) {
      try {
        // Normalize profile using model (handles migration)
        const migratedProfile = AgentProfileModel.normalize(profile);

        await this.firestoreService.saveDocument(
          this.COLLECTION_NAME,
          migratedProfile
        );
        console.log(`✅ Synced agent: ${migratedProfile.name}`);
        success++;
      } catch (error) {
        console.error(`❌ Failed to sync agent ${profile.id}:`, error);
        failed++;
      }
    }

    console.log(
      `🎉 Manual sync complete: ${success} succeeded, ${failed} failed`
    );
    return { success, failed };
  }

  /**
   * Clear all agent profiles from localStorage only (does not affect Firestore)
   * Used when user logs out to clear local data
   * Resets to default agents after clearing
   * @returns Number of profiles cleared
   */
  clearLocalStorage(): number {
    const count = this.profilesSignal().length;
    // Reset to default agents so app can still function
    this.resetToDefaults();
    return count;
  }

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
