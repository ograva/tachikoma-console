import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { FirestoreService, SyncableData } from './firestore.service';
import { AuthService } from './auth.service';
import { EncryptionService } from './encryption.service';

export type GeminiModel =
  | 'gemini-2.0-flash'
  | 'gemini-2.5-flash'
  | 'gemini-3.0';

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3.0', label: 'Gemini 3.0' },
];

export interface UserProfile extends SyncableData {
  id: string;
  email: string;
  displayName: string;
  chatUsername: string;
  photoURL: string | null;
  geminiApiKey?: string; // Encrypted in Firestore, plain in localStorage
  geminiApiKeyEncrypted?: string; // Used only for Firestore storage
  geminiModel?: GeminiModel;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'email'> = {
  displayName: '',
  chatUsername: 'USER',
  photoURL: null,
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);
  private encryptionService = inject(EncryptionService);

  private readonly COLLECTION_NAME = 'user_profile';
  private readonly LOCAL_PROFILE_KEY = 'tachikoma_user_profile';

  // Signals
  private profileSignal = signal<UserProfile | null>(null);
  private loadingSignal = signal<boolean>(false);

  // Public computed signals
  readonly profile = computed(() => this.profileSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly chatUsername = computed(
    () => this.profileSignal()?.chatUsername || 'USER'
  );
  readonly displayName = computed(
    () =>
      this.profileSignal()?.displayName ||
      this.authService.user()?.displayName ||
      ''
  );
  readonly geminiApiKey = computed(
    () => this.profileSignal()?.geminiApiKey || ''
  );
  readonly geminiModel = computed(
    () => this.profileSignal()?.geminiModel || 'gemini-2.5-flash'
  );

  constructor() {
    // Load profile from localStorage immediately
    this.loadFromLocalStorage();

    // React to auth state changes
    effect(() => {
      const user = this.authService.user();
      if (user) {
        this.loadOrCreateProfile(user.uid, user.email || '');
      } else {
        // Load anonymous profile from localStorage
        this.loadFromLocalStorage();
      }
    });
  }

  /**
   * Load profile from localStorage
   */
  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem(this.LOCAL_PROFILE_KEY);
    if (stored) {
      try {
        const profile = JSON.parse(stored) as UserProfile;
        this.profileSignal.set(profile);
      } catch (e) {
        console.error('Error loading profile from localStorage:', e);
      }
    }
  }

  /**
   * Save profile to localStorage
   */
  private saveToLocalStorage(profile: UserProfile): void {
    localStorage.setItem(this.LOCAL_PROFILE_KEY, JSON.stringify(profile));
  }

  /**
   * Load or create user profile
   */
  private async loadOrCreateProfile(
    userId: string,
    email: string
  ): Promise<void> {
    this.loadingSignal.set(true);

    try {
      // Try to get existing profile from Firestore
      const existing = await this.firestoreService.getDocument<UserProfile>(
        this.COLLECTION_NAME,
        userId
      );

      if (existing) {
        // Decrypt API key if present
        if (existing.geminiApiKeyEncrypted) {
          try {
            existing.geminiApiKey = await this.encryptionService.decrypt(
              existing.geminiApiKeyEncrypted,
              userId
            );
          } catch (error) {
            console.error('Error decrypting API key:', error);
            existing.geminiApiKey = '';
          }
        }

        this.profileSignal.set(existing);
        this.saveToLocalStorage(existing);
      } else {
        // Create new profile
        const authUser = this.authService.user();
        const newProfile: UserProfile = {
          id: userId,
          email: email,
          displayName: authUser?.displayName || '',
          chatUsername:
            authUser?.displayName?.split(' ')[0]?.toUpperCase() || 'USER',
          photoURL: authUser?.photoURL || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await this.saveProfileToFirestore(newProfile);
        this.profileSignal.set(newProfile);
        this.saveToLocalStorage(newProfile);
      }
    } catch (error) {
      console.error('Error loading/creating profile:', error);
      // Fall back to localStorage
      this.loadFromLocalStorage();
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Save profile to Firestore with encrypted API key
   */
  private async saveProfileToFirestore(profile: UserProfile): Promise<void> {
    if (!this.authService.isRealUser()) {
      console.log('💾 User profile saved locally (not syncing - user not authenticated)');
      return;
    }

    try {
      console.log('☁️ Syncing user profile to Firestore...');
      const userId = profile.id;
      const profileToSave = { ...profile };

      // Encrypt API key before saving to Firestore
      if (profileToSave.geminiApiKey) {
        profileToSave.geminiApiKeyEncrypted =
          await this.encryptionService.encrypt(
            profileToSave.geminiApiKey,
            userId
          );
        // Remove plain API key from Firestore document
        delete profileToSave.geminiApiKey;
      }

      await this.firestoreService.saveDocument(
        this.COLLECTION_NAME,
        profileToSave
      );
      console.log('✅ User profile synced to Firestore');
    } catch (error) {
      console.error('❌ Error saving profile to Firestore:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<void> {
    const current = this.profileSignal();
    if (!current) return;

    this.loadingSignal.set(true);

    try {
      const updated: UserProfile = {
        ...current,
        ...updates,
        updatedAt: Date.now(),
      };

      // Save to localStorage first (plain text API key)
      this.saveToLocalStorage(updated);
      this.profileSignal.set(updated);
      console.log('💾 User profile saved to localStorage');

      // Forward to Firestore if authenticated (with encryption)
      if (this.authService.isRealUser()) {
        await this.saveProfileToFirestore(updated);
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update chat username
   */
  async updateChatUsername(username: string): Promise<void> {
    await this.updateProfile({ chatUsername: username.toUpperCase() });
  }

  /**
   * Update display name
   */
  async updateDisplayName(name: string): Promise<void> {
    await this.updateProfile({ displayName: name });
  }

  /**
   * Get current chat username (for use in chat messages)
   */
  getChatUsername(): string {
    return this.profileSignal()?.chatUsername || 'USER';
  }

  /**
   * Get current Gemini API key
   */
  getGeminiApiKey(): string {
    return this.profileSignal()?.geminiApiKey || '';
  }

  /**
   * Get current Gemini model
   */
  getGeminiModel(): GeminiModel {
    return this.profileSignal()?.geminiModel || 'gemini-2.5-flash';
  }

  /**
   * Sanitize API key by removing non-ASCII characters
   */
  private sanitizeApiKey(key: string): string {
    return key.replace(/[^\x00-\x7F]/g, '').trim();
  }

  /**
   * Validate Gemini API key by making a test request
   * @returns Promise<{ valid: boolean; error?: string }>
   */
  async validateGeminiApiKey(
    apiKey: string
  ): Promise<{ valid: boolean; error?: string }> {
    const cleanKey = this.sanitizeApiKey(apiKey);

    if (!cleanKey) {
      return { valid: false, error: 'API key is empty or invalid' };
    }

    try {
      // Test the API key by listing models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData?.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        return { valid: false, error: errorMessage };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Failed to validate API key',
      };
    }
  }

  /**
   * Update Gemini API key (validates before saving)
   * @throws Error if API key is invalid
   */
  async updateGeminiApiKey(apiKey: string): Promise<void> {
    const cleanKey = this.sanitizeApiKey(apiKey);

    // Validate the key first
    const validation = await this.validateGeminiApiKey(cleanKey);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid API key');
    }

    // Save to profile
    await this.updateProfile({ geminiApiKey: cleanKey });
  }

  /**
   * Update Gemini model selection
   */
  async updateGeminiModel(model: GeminiModel): Promise<void> {
    await this.updateProfile({ geminiModel: model });
  }

  /**
   * Create anonymous profile for non-authenticated users
   */
  createAnonymousProfile(): UserProfile {
    const profile: UserProfile = {
      id: 'anonymous',
      email: '',
      displayName: 'Guest',
      chatUsername: 'USER',
      photoURL: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.profileSignal.set(profile);
    this.saveToLocalStorage(profile);
    return profile;
  }
}
