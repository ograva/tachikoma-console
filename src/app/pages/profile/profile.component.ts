import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { AuthService } from 'src/app/services/auth.service';
import {
  UserProfileService,
  UserProfile,
  GeminiModel,
  GEMINI_MODELS,
} from 'src/app/services/user-profile.service';
import { ChatStorageService } from 'src/app/services/chat-storage.service';
import { AgentProfileService } from 'src/app/services/agent-profile.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    TablerIconsModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  private authService = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  private chatStorageService = inject(ChatStorageService);
  private agentProfileService = inject(AgentProfileService);
  private router = inject(Router);

  // Signals from services
  user = this.authService.user;
  profile = this.userProfileService.profile;
  isLoading = this.userProfileService.isLoading;
  isAuthenticated = this.authService.isAuthenticated;

  // Available Gemini models
  geminiModels = GEMINI_MODELS;

  // API tier options
  rateLimitOptions = [
    { value: 15, label: 'Free Tier (15 requests/min)' },
    { value: 60, label: 'Pay-as-you-go (60 requests/min)' },
    { value: 1000, label: 'Paid Tier (1000 requests/min)' },
  ];

  // Form state
  editingDisplayName = signal<boolean>(false);
  editingChatUsername = signal<boolean>(false);
  editingApiKey = signal<boolean>(false);
  displayNameInput = signal<string>('');
  chatUsernameInput = signal<string>('');
  apiKeyInput = signal<string>('');
  selectedModel = signal<GeminiModel>('gemini-2.5-flash');

  // API key validation state
  isValidatingApiKey = signal<boolean>(false);
  apiKeyValidationError = signal<string | null>(null);

  // Sync state for chats
  isSyncingChats = signal<boolean>(false);
  syncChatsMessage = signal<string | null>(null);

  // Sync state for agents
  isSyncingAgents = signal<boolean>(false);
  syncAgentsMessage = signal<string | null>(null);

  // Success/error messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  startEditDisplayName(): void {
    this.displayNameInput.set(this.profile()?.displayName || '');
    this.editingDisplayName.set(true);
    this.clearMessages();
  }

  startEditChatUsername(): void {
    this.chatUsernameInput.set(this.profile()?.chatUsername || 'USER');
    this.editingChatUsername.set(true);
    this.clearMessages();
  }

  startEditApiKey(): void {
    // Don't pre-fill the API key for security reasons (show as masked)
    this.apiKeyInput.set('');
    this.editingApiKey.set(true);
    this.apiKeyValidationError.set(null);
    this.clearMessages();
  }

  cancelEditDisplayName(): void {
    this.editingDisplayName.set(false);
    this.clearMessages();
  }

  cancelEditChatUsername(): void {
    this.editingChatUsername.set(false);
    this.clearMessages();
  }

  cancelEditApiKey(): void {
    this.editingApiKey.set(false);
    this.apiKeyValidationError.set(null);
    this.clearMessages();
  }

  async saveDisplayName(): Promise<void> {
    try {
      await this.userProfileService.updateDisplayName(this.displayNameInput());
      this.editingDisplayName.set(false);
      this.successMessage.set('Display name updated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error) {
      this.errorMessage.set('Failed to update display name. Please try again.');
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  async saveChatUsername(): Promise<void> {
    const username = this.chatUsernameInput().trim();
    if (!username) {
      this.errorMessage.set('Chat username cannot be empty.');
      setTimeout(() => this.errorMessage.set(null), 5000);
      return;
    }

    try {
      await this.userProfileService.updateChatUsername(username);
      this.editingChatUsername.set(false);
      this.successMessage.set('Chat username updated successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error) {
      this.errorMessage.set(
        'Failed to update chat username. Please try again.'
      );
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  async saveApiKey(): Promise<void> {
    const apiKey = this.apiKeyInput().trim();
    if (!apiKey) {
      this.apiKeyValidationError.set('API key cannot be empty.');
      return;
    }

    this.isValidatingApiKey.set(true);
    this.apiKeyValidationError.set(null);

    try {
      await this.userProfileService.updateGeminiApiKey(apiKey);
      this.editingApiKey.set(false);
      this.apiKeyInput.set(''); // Clear input for security
      this.successMessage.set('API key validated and saved successfully!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error: any) {
      this.apiKeyValidationError.set(
        error.message || 'Failed to validate API key.'
      );
    } finally {
      this.isValidatingApiKey.set(false);
    }
  }

  async onModelChange(model: GeminiModel): Promise<void> {
    try {
      await this.userProfileService.updateGeminiModel(model);
      this.successMessage.set('Model preference saved!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error) {
      this.errorMessage.set(
        'Failed to save model preference. Please try again.'
      );
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  async onRateLimitChange(rateLimitRPM: number): Promise<void> {
    try {
      await this.userProfileService.updateRateLimitRPM(rateLimitRPM);
      this.successMessage.set('API rate limit updated!');
      setTimeout(() => this.successMessage.set(null), 3000);
    } catch (error) {
      this.errorMessage.set('Failed to save rate limit. Please try again.');
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  getMaskedApiKey(): string {
    const key = this.profile()?.geminiApiKey;
    if (!key) return 'Not set';
    // Show first 4 and last 4 characters
    if (key.length <= 8) return '********';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }

  hasApiKey(): boolean {
    return !!this.profile()?.geminiApiKey;
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/authentication/login']);
    } catch (error) {
      this.errorMessage.set('Failed to logout. Please try again.');
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
  }

  goToLogin(): void {
    this.router.navigate(['/authentication/login']);
  }

  async syncChatsToCloud(): Promise<void> {
    if (!this.authService.isRealUser()) {
      this.errorMessage.set('Please log in with a real account to sync chats.');
      setTimeout(() => this.errorMessage.set(null), 5000);
      return;
    }

    this.isSyncingChats.set(true);
    this.syncChatsMessage.set('Syncing chats to Firestore...');
    this.clearMessages();

    try {
      const result = await this.chatStorageService.manualSyncAllChatsToCloud();

      if (result.success > 0) {
        this.successMessage.set(
          `✅ Successfully synced ${result.success} chat${
            result.success > 1 ? 's' : ''
          }!` +
            (result.failed > 0 ? ` (${result.failed} failed)` : '') +
            (result.skipped > 0
              ? ` (${result.skipped} skipped - too large)`
              : '')
        );
      } else if (result.skipped > 0) {
        this.errorMessage.set(
          `⚠️ ${result.skipped} chat${
            result.skipped > 1 ? 's' : ''
          } skipped (too large for Firestore)`
        );
      } else if (result.failed > 0) {
        this.errorMessage.set(
          `❌ Failed to sync ${result.failed} chat${
            result.failed > 1 ? 's' : ''
          }`
        );
      } else {
        this.successMessage.set('No chats to sync.');
      }

      setTimeout(() => {
        this.successMessage.set(null);
        this.errorMessage.set(null);
      }, 5000);
    } catch (error) {
      this.errorMessage.set(
        'Failed to sync chats. Please check console for details.'
      );
      console.error('Sync error:', error);
      setTimeout(() => this.errorMessage.set(null), 5000);
    } finally {
      this.isSyncingChats.set(false);
      this.syncChatsMessage.set(null);
    }
  }

  async syncAgentsToCloud(): Promise<void> {
    if (!this.authService.isRealUser()) {
      this.errorMessage.set(
        'Please log in with a real account to sync agents.'
      );
      setTimeout(() => this.errorMessage.set(null), 5000);
      return;
    }

    this.isSyncingAgents.set(true);
    this.syncAgentsMessage.set('Syncing agent profiles to Firestore...');
    this.clearMessages();

    try {
      const result =
        await this.agentProfileService.manualSyncAllProfilesToCloud();

      if (result.success > 0) {
        this.successMessage.set(
          `✅ Successfully synced ${result.success} agent profile${
            result.success > 1 ? 's' : ''
          }!` + (result.failed > 0 ? ` (${result.failed} failed)` : '')
        );
      } else if (result.failed > 0) {
        this.errorMessage.set(
          `❌ Failed to sync ${result.failed} agent profile${
            result.failed > 1 ? 's' : ''
          }`
        );
      } else {
        this.successMessage.set('No agent profiles to sync.');
      }

      setTimeout(() => {
        this.successMessage.set(null);
        this.errorMessage.set(null);
      }, 5000);
    } catch (error) {
      this.errorMessage.set(
        'Failed to sync agents. Please check console for details.'
      );
      console.error('Sync error:', error);
      setTimeout(() => this.errorMessage.set(null), 5000);
    } finally {
      this.isSyncingAgents.set(false);
      this.syncAgentsMessage.set(null);
    }
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.syncChatsMessage.set(null);
    this.syncAgentsMessage.set(null);
  }
}
