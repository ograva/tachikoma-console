import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  UserCredential,
  Unsubscribe,
} from '@angular/fire/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnDestroy {
  private auth: Auth | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private firebaseConfigured = false;

  // Signals for reactive state
  private userSignal = signal<AuthUser | null>(null);
  private loadingSignal = signal<boolean>(true);
  private errorSignal = signal<string | null>(null);

  // Public computed signals
  readonly user = computed(() => this.userSignal());
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly isLoading = computed(() => this.loadingSignal());
  readonly error = computed(() => this.errorSignal());

  constructor() {
    try {
      this.auth = inject(Auth);
      this.firebaseConfigured = true;
      this.initAuthListener();
    } catch (error) {
      console.warn('Firebase Auth not configured. Authentication features will be disabled.');
      this.loadingSignal.set(false);
      this.firebaseConfigured = false;
    }
  }

  /**
   * Check if Firebase is properly configured
   */
  isFirebaseConfigured(): boolean {
    return this.firebaseConfigured;
  }

  /**
   * Initialize auth state listener - called once on app startup
   */
  initAuthListener(): void {
    if (!this.auth) return;
    
    this.loadingSignal.set(true);

    this.unsubscribe = onAuthStateChanged(
      this.auth,
      (user: User | null) => {
        if (user) {
          this.userSignal.set({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } else {
          this.userSignal.set(null);
        }
        this.loadingSignal.set(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        this.errorSignal.set(error.message);
        this.loadingSignal.set(false);
      }
    );
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(
    email: string,
    password: string
  ): Promise<UserCredential> {
    if (!this.auth) {
      throw new Error('Firebase Auth not configured');
    }
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      const result = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return result;
    } catch (error: any) {
      this.errorSignal.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Register with email and password
   */
  async registerWithEmail(
    email: string,
    password: string
  ): Promise<UserCredential> {
    if (!this.auth) {
      throw new Error('Firebase Auth not configured');
    }
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      const result = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      return result;
    } catch (error: any) {
      this.errorSignal.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<UserCredential> {
    if (!this.auth) {
      throw new Error('Firebase Auth not configured');
    }
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      return result;
    } catch (error: any) {
      this.errorSignal.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Sign out
   */
  async logout(): Promise<void> {
    if (!this.auth) {
      return;
    }
    try {
      this.loadingSignal.set(true);
      this.errorSignal.set(null);
      await signOut(this.auth);
    } catch (error: any) {
      this.errorSignal.set(this.getErrorMessage(error.code));
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Clear any error
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.userSignal()?.uid || null;
  }

  /**
   * Convert Firebase error codes to user-friendly messages
   */
  private getErrorMessage(code: string): string {
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled.';
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please check your email and password.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
