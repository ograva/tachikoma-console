import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService, AuthUser } from './services/auth.service';
import { FirestoreService } from './services/firestore.service';
import {
  ChatStorageService,
  ChatSession,
} from './services/chat-storage.service';
import {
  AgentProfileService,
  AgentProfile,
} from './services/agent-profile.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Tachikoma Console';

  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private chatStorageService = inject(ChatStorageService);
  private agentProfileService = inject(AgentProfileService);

  private hasCheckedInitialSync = false;

  constructor() {
    // Use Angular effect to react to auth state changes
    effect(() => {
      const user = this.authService.user();
      const isLoading = this.authService.isLoading();

      // Only proceed when auth is not loading and we have a user
      if (!isLoading && user && !this.hasCheckedInitialSync) {
        this.handleAuthStateChange(user);
      }
    });
  }

  ngOnInit(): void {
    console.log('🚀 Tachikoma Console initialized');
  }

  ngOnDestroy(): void {
    // Cleanup is handled by AuthService
  }

  /**
   * Handle auth state changes and sync data if needed
   */
  private async handleAuthStateChange(user: AuthUser): Promise<void> {
    this.hasCheckedInitialSync = true;

    // Check if user is authenticated and not anonymous
    const isRealUser = this.authService.isRealUser();

    if (!isRealUser) {
      console.log('👤 Anonymous or guest user - skipping Firestore sync');
      return;
    }

    console.log('✅ Authenticated user detected:', user.email);

    // Check if we need to sync data from Firestore to localStorage
    await this.checkAndSyncFromFirestore();
  }

  /**
   * Check if Firestore has data missing from localStorage and sync
   * Services now handle merging automatically - no need for pre-checking
   */
  private async checkAndSyncFromFirestore(): Promise<void> {
    console.log('🔍 Syncing data from Firestore...');

    try {
      // Services will automatically merge only new data from Firestore
      await this.chatStorageService.loadFromCloud();
      await this.agentProfileService.loadFromCloud();
    } catch (error) {
      console.error('❌ Error syncing Firestore data:', error);
    }
  }
}
