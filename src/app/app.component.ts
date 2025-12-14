import { Component, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { FirestoreService } from './services/firestore.service';
import { ChatStorageService } from './services/chat-storage.service';
import { AgentProfileService } from './services/agent-profile.service';

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
  private async handleAuthStateChange(user: any): Promise<void> {
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
   */
  private async checkAndSyncFromFirestore(): Promise<void> {
    console.log('🔍 Checking for Firestore data to sync...');

    try {
      // Get current localStorage data
      const localChats = this.chatStorageService.getSessions();
      const localAgents = this.agentProfileService.getProfiles();

      console.log(`📊 Local data: ${localChats.length} chats, ${localAgents.length} agents`);

      // Get Firestore data
      const firestoreChats = await this.firestoreService.getDocuments('chat_sessions');
      const firestoreAgents = await this.firestoreService.getDocuments('agent_profiles');

      console.log(`☁️  Firestore data: ${firestoreChats.length} chats, ${firestoreAgents.length} agents`);

      // Check if Firestore has chats missing from localStorage
      const missingChats = firestoreChats.filter(
        (fsChat: any) => !localChats.find((localChat) => localChat.id === fsChat.id)
      );

      // Check if Firestore has agents missing from localStorage
      const missingAgents = firestoreAgents.filter(
        (fsAgent: any) => !localAgents.find((localAgent) => localAgent.id === fsAgent.id)
      );

      if (missingChats.length > 0) {
        console.log(`📥 Found ${missingChats.length} chats in Firestore missing from localStorage`);
        // Load chats from cloud which updates localStorage
        await this.chatStorageService.loadFromCloud();
        console.log('✅ Chats synced from Firestore to localStorage');
      }

      if (missingAgents.length > 0) {
        console.log(`📥 Found ${missingAgents.length} agents in Firestore missing from localStorage`);
        // Load agents from cloud which updates localStorage
        await this.agentProfileService.loadFromCloud();
        console.log('✅ Agents synced from Firestore to localStorage');
      }

      if (missingChats.length === 0 && missingAgents.length === 0) {
        console.log('✅ All Firestore data already in localStorage - no sync needed');
      }

    } catch (error) {
      console.error('❌ Error checking/syncing Firestore data:', error);
    }
  }
}
