import {
  Component,
  Output,
  EventEmitter,
  Input,
  ViewEncapsulation,
  signal,
  effect,
  inject,
  computed,
} from '@angular/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AuthService } from 'src/app/services/auth.service';
import { UserProfileService } from 'src/app/services/user-profile.service';

@Component({
  selector: 'app-header',
  imports: [
    RouterModule,
    CommonModule,
    NgScrollbarModule,
    TablerIconsModule,
    MaterialModule,
  ],
  templateUrl: './header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  private authService = inject(AuthService);
  private userProfileService = inject(UserProfileService);
  private router = inject(Router);

  isDarkTheme = signal(true); // Default to dark theme

  // Auth state
  isAuthenticated = this.authService.isAuthenticated;
  user = this.authService.user;
  displayName = this.userProfileService.displayName;
  
  // Computed user avatar
  userPhotoURL = computed(() => {
    const authUser = this.authService.user();
    return authUser?.photoURL || null;
  });

  constructor() {
    // Load theme preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkTheme.set(savedTheme === 'dark');
    }

    // Apply theme on init
    this.applyTheme();

    // Watch for theme changes
    effect(() => {
      this.applyTheme();
    });
  }

  toggleTheme(): void {
    this.isDarkTheme.update((val) => !val);
    const theme = this.isDarkTheme() ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
  }

  private applyTheme(): void {
    const htmlElement = document.documentElement;
    if (this.isDarkTheme()) {
      htmlElement.classList.remove('light-theme');
      htmlElement.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    } else {
      htmlElement.classList.remove('dark-theme');
      htmlElement.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    }
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToLogin(): void {
    this.router.navigate(['/authentication/login']);
  }

  async logout(): Promise<void> {
    try {
      await this.authService.logout();
      this.router.navigate(['/authentication/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
