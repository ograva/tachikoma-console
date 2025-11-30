import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { FirestoreService, SyncableData } from './firestore.service';
import { AuthService } from './auth.service';

export interface UserProfile extends SyncableData {
  id: string;
  email: string;
  displayName: string;
  chatUsername: string;
  photoURL: string | null;
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_PROFILE: Omit<UserProfile, 'id' | 'email'> = {
  displayName: '',
  chatUsername: 'USER',
  photoURL: null,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private firestoreService = inject(FirestoreService);
  private authService = inject(AuthService);

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

        await this.firestoreService.saveDocument(
          this.COLLECTION_NAME,
          newProfile
        );
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

      // Save to localStorage first
      this.saveToLocalStorage(updated);
      this.profileSignal.set(updated);

      // Forward to Firestore if authenticated
      if (this.authService.isAuthenticated()) {
        await this.firestoreService.saveDocument(this.COLLECTION_NAME, updated);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
