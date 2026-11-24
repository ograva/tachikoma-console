import { Injectable, signal, inject } from '@angular/core';
import { FirestoreService, SyncTarget } from './firestore.service';
import { AuthService } from './auth.service';
import { AgentProfile, AgentProfileModel, SyncableData } from '../models';

export { AgentProfile };

@Injectable({
  providedIn: 'root',
})
export class AgentProfileService implements SyncTarget<AgentProfile> {
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
    const newProfile = AgentProfileModel.normalize({
      ...profile,
      id: this.generateId(),
      status: 'idle' as const,
      createdAt: now,
      updatedAt: now,
    });

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
   * Load profiles from Firestore (called after sign-in).
   * Merges cloud data into local state by id; when both sides hold a profile
   * the newer `updatedAt` wins. A local default agent the user never edited
   * (e.g. the fresh-device `logikoma`, stamped with boot time) always yields
   * to its cloud version.
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

      if (profiles.length === 0) {
        console.log('📭 No agent profiles found in Firestore');
        return;
      }

      const merged = new Map<string, AgentProfile>();
      this.profilesSignal().forEach((p) => merged.set(p.id, p));
      let restored = 0;
      for (const raw of profiles) {
        const cloud = AgentProfileModel.fromFirestore(raw);
        const local = merged.get(cloud.id);
        if (
          !local ||
          AgentProfileService.isUntouchedDefault(local) ||
          (cloud.updatedAt ?? 0) > (local.updatedAt ?? 0)
        ) {
          merged.set(cloud.id, cloud);
          restored++;
        }
      }

      if (restored > 0) {
        this.profilesSignal.set(Array.from(merged.values()));
        this.saveProfiles();
        console.log(
          `✅ Restored ${restored} agent profiles from Firestore (${profiles.length} in cloud)`
        );
      } else {
        console.log(
          `✅ All ${profiles.length} Firestore agent profiles are already up to date locally`
        );
      }
    } catch (error) {
      console.error('❌ Error loading agent profiles from cloud:', error);
    }
  }

  /**
   * True when `profile` is a built-in default agent with no user edits, i.e.
   * equal to its factory definition apart from timestamps and runtime status.
   */
  static isUntouchedDefault(profile: AgentProfile): boolean {
    const factory = AgentProfileModel.getDefaults().find(
      (d) => d.id === profile.id
    );
    if (!factory) return false;
    const content = (p: AgentProfile) => {
      const { createdAt, updatedAt, status, ...rest } =
        AgentProfileModel.normalize(p);
      return JSON.stringify(
        Object.entries(rest)
          .filter(([, value]) => value !== undefined)
          .sort(([a], [b]) => a.localeCompare(b))
      );
    };
    return content(profile) === content(factory);
  }

  // ── SyncTarget (login sync strategies, FirestoreService.syncOnLogin) ──────

  /** The profiles the app currently holds (the signal persisted under `tachikoma_agent_profiles`). */
  getLocalSyncData(): AgentProfile[] {
    return this.profilesSignal();
  }

  /**
   * Replace local profiles with the strategy result and persist them locally.
   * An empty result falls back to the default agents (locally only) so the
   * console always has agents to run.
   */
  applySyncResult(items: SyncableData[]): void {
    const profiles = items.map((p) => AgentProfileModel.fromFirestore(p));
    this.profilesSignal.set(
      profiles.length > 0 ? profiles : this.getDefaultProfiles()
    );
    this.saveProfiles();
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
