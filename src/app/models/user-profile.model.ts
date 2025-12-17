import { SyncableData } from './syncable-data.model';

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
  rateLimitRPM?: number; // API rate limit (15 for free, 1000 for paid)
  createdAt: number;
  updatedAt: number;
}

/**
 * UserProfile model with normalization and factory methods
 */
export class UserProfileModel {
  /**
   * Default values for optional fields
   */
  static readonly DEFAULTS = {
    displayName: '',
    chatUsername: 'USER',
    photoURL: null,
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash' as GeminiModel,
    rateLimitRPM: 15, // Free tier default
  };

  /**
   * Normalize profile data to ensure all optional fields have proper defaults
   * Use this when loading data from any source (localStorage, Firestore)
   */
  static normalize(profile: Partial<UserProfile>): UserProfile {
    return {
      ...profile,
      geminiModel: profile.geminiModel ?? UserProfileModel.DEFAULTS.geminiModel,
      rateLimitRPM:
        profile.rateLimitRPM ?? UserProfileModel.DEFAULTS.rateLimitRPM,
      geminiApiKey:
        profile.geminiApiKey ?? UserProfileModel.DEFAULTS.geminiApiKey,
      photoURL: profile.photoURL ?? UserProfileModel.DEFAULTS.photoURL,
      chatUsername:
        profile.chatUsername || UserProfileModel.DEFAULTS.chatUsername,
      displayName: profile.displayName || UserProfileModel.DEFAULTS.displayName,
    } as UserProfile;
  }

  /**
   * Create a profile from Firestore data
   */
  static fromFirestore(data: any): UserProfile {
    return UserProfileModel.normalize(data);
  }

  /**
   * Create a profile from localStorage data
   */
  static fromLocalStorage(data: any): UserProfile {
    return UserProfileModel.normalize(data);
  }

  /**
   * Create a new user profile with minimal data
   */
  static create(
    id: string,
    email: string,
    displayName?: string,
    photoURL?: string | null
  ): UserProfile {
    const now = Date.now();
    return {
      id,
      email,
      displayName: displayName || UserProfileModel.DEFAULTS.displayName,
      chatUsername:
        displayName?.split(' ')[0]?.toUpperCase() ||
        UserProfileModel.DEFAULTS.chatUsername,
      photoURL: photoURL ?? UserProfileModel.DEFAULTS.photoURL,
      geminiModel: UserProfileModel.DEFAULTS.geminiModel,
      rateLimitRPM: UserProfileModel.DEFAULTS.rateLimitRPM,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create an anonymous profile for non-authenticated users
   */
  static createAnonymous(): UserProfile {
    const now = Date.now();
    return {
      id: 'anonymous',
      email: '',
      displayName: 'Guest',
      chatUsername: 'USER',
      photoURL: null,
      geminiModel: UserProfileModel.DEFAULTS.geminiModel,
      rateLimitRPM: UserProfileModel.DEFAULTS.rateLimitRPM,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Type guard to check if an object is a valid UserProfile
   */
  static isUserProfile(obj: any): obj is UserProfile {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.email === 'string' &&
      typeof obj.chatUsername === 'string'
    );
  }
}
