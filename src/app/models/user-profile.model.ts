import { SyncableData } from './syncable-data.model';

export type GeminiModel =
  | 'models/gemma-4-26b-a4b-it'
  | 'models/gemma-4-31b-it'
  | 'models/gemini-flash-latest'
  | 'models/gemini-flash-lite-latest'
  | 'models/gemini-pro-latest'
  | 'models/gemini-3.1-pro-preview'
  | 'models/gemini-3.1-flash-lite'
  | 'models/gemini-3.5-flash';

export const GEMINI_MODELS: { value: GeminiModel; label: string }[] = [
  { value: 'models/gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B IT' },
  { value: 'models/gemma-4-31b-it', label: 'Gemma 4 31B IT' },
  { value: 'models/gemini-flash-latest', label: 'Gemini Flash Latest' },
  { value: 'models/gemini-flash-lite-latest', label: 'Gemini Flash-Lite Latest' },
  { value: 'models/gemini-pro-latest', label: 'Gemini Pro Latest' },
  { value: 'models/gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview' },
  { value: 'models/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { value: 'models/gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
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
    geminiModel: 'models/gemini-3.5-flash' as GeminiModel,
    rateLimitRPM: 15, // Free tier default
  };

  /**
   * Normalize profile data to ensure all optional fields have proper defaults
   * Use this when loading data from any source (localStorage, Firestore)
   */
  static normalize(profile: Partial<UserProfile>): UserProfile {
    let geminiModel = profile.geminiModel;
    if (!geminiModel || !GEMINI_MODELS.some(m => m.value === geminiModel)) {
      geminiModel = UserProfileModel.DEFAULTS.geminiModel;
    }
    return {
      ...profile,
      geminiModel,
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
