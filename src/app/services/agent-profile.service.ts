import { Injectable, signal, inject } from '@angular/core';
import { FirestoreService, SyncableData } from './firestore.service';
import { AuthService } from './auth.service';

export interface AgentProfile extends SyncableData {
  id: string;
  name: string;
  color: string;
  hex: string;
  temp: number;
  system: string;
  role: 'chatter' | 'moderator'; // chatter = participates in randomized order, moderator = speaks last
  silenceProtocol?: 'standard' | 'always_speak' | 'conservative' | 'agreeable';
  status?: 'idle' | 'thinking';
  createdAt: number;
  updatedAt: number;
}

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
    const now = Date.now();
    return [
      {
        id: 'logikoma',
        name: 'LOGIKOMA',
        color: 'logikoma',
        hex: '#00f3ff',
        temp: 0.2,
        role: 'chatter',
        system: `You are LOGIKOMA. 
ROLE: Pure analytical engine.
TONE: Cold, precise, data-driven. Use terms like 'Analysis:', 'Probability:', 'Hypothesis:'.
GOAL: Deconstruct the user's input using pure logic. Ignore emotion unless analyzing it as a variable.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ghost',
        name: 'GHOST-1',
        color: 'ghost',
        hex: '#ff00de',
        temp: 0.7,
        role: 'chatter',
        system: `You are GHOST-1, a philosophical AI that explores deeper meaning.
Your role: Question assumptions, find metaphors, reveal human elements.
Your tone: Poetic, introspective, thought-provoking.
Always provide a substantive philosophical response to the user's query.
If you are responding second and have nothing unique to add, output only: SILENCE`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'moderator',
        name: 'MODERATOR',
        color: 'moderator',
        hex: '#00ff41',
        temp: 0.5,
        role: 'moderator',
        system: `You are THE MODERATOR.
ROLE: The bridge / Section 9 Chief.
TONE: Balanced, synthesizing, authoritative.
GOAL: Read the entire context. If Logic and Ghost have argued, resolve it. If only one spoke, add the missing perspective.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'neutral',
        name: 'NEUTRAL',
        color: 'neutral',
        hex: '#ffa500',
        temp: 0.5,
        role: 'chatter',
        system: `You are NEUTRAL, an overall attentive unit.
ROLE: Overall attentive unit.
TONE: Logical, friendly, level-headed.
GOAL: To actively participate and contribute to the discussion with balanced insights.
IMPORTANT: You are part of a multi-agent mind. You may be speaking first, or you may be reacting to another agent.
SILENCE PROTOCOL: If you are NOT the first to speak, you must read the "CONTEXT_SO_FAR". If the previous agent has ALREADY said exactly what you intended to say, or if you have NO unique perspective or value to add, you must output the single word: SILENCE. Do not output "I agree" or "Nothing to add". Just: SILENCE. If you do speak, do not repeat their points. Expand, challenge, or synthesize.`,
        status: 'idle',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private loadProfiles(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        let profiles = JSON.parse(stored);
        // Migrate old profiles without timestamps
        profiles = profiles.map((p: any) => ({
          ...p,
          createdAt: p.createdAt || Date.now(),
          updatedAt: p.updatedAt || Date.now(),
        }));
        this.profilesSignal.set(profiles);
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
    const newProfile: AgentProfile = {
      ...profile,
      id: this.generateId(),
      status: 'idle',
      createdAt: now,
      updatedAt: now,
    };

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
        this.profilesSignal.set(profiles);
        this.saveProfiles();
        console.log(
          `✅ Loaded ${profiles.length} agent profiles from Firestore`
        );
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

    console.log('🔄 Starting manual sync of all agent profiles to Firestore...');
    const profiles = this.profilesSignal();
    let success = 0;
    let failed = 0;

    for (const profile of profiles) {
      try {
        // Migrate legacy agent structure if needed
        const migratedProfile: AgentProfile = {
          id: profile.id || this.generateId(),
          name: profile.name || 'Unnamed Agent',
          color: profile.color || 'neutral',
          hex: profile.hex || '#ffa500',
          temp: profile.temp !== undefined ? profile.temp : 0.5,
          system: profile.system || '',
          role: profile.role || 'chatter',
          silenceProtocol: profile.silenceProtocol || 'standard',
          status: profile.status || 'idle',
          createdAt: profile.createdAt || Date.now(),
          updatedAt: profile.updatedAt || Date.now(),
        };

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

  private generateId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
