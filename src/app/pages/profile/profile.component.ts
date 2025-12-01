import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfileService, UserProfile } from 'src/app/services/user-profile.service';

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
  private router = inject(Router);

  // Signals from services
  user = this.authService.user;
  profile = this.userProfileService.profile;
  isLoading = this.userProfileService.isLoading;
  isAuthenticated = this.authService.isAuthenticated;

  // Form state
  editingDisplayName = signal<boolean>(false);
  editingChatUsername = signal<boolean>(false);
  displayNameInput = signal<string>('');
  chatUsernameInput = signal<string>('');

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

  cancelEditDisplayName(): void {
    this.editingDisplayName.set(false);
    this.clearMessages();
  }

  cancelEditChatUsername(): void {
    this.editingChatUsername.set(false);
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
      this.errorMessage.set('Failed to update chat username. Please try again.');
      setTimeout(() => this.errorMessage.set(null), 5000);
    }
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

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }
}
