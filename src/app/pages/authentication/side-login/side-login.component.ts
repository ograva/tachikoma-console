import { Component, inject, signal, effect } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from 'src/app/services/auth.service';
import { FirestoreService } from 'src/app/services/firestore.service';
import {
  SyncDialogComponent,
  SyncStrategy,
} from 'src/app/components/sync-dialog/sync-dialog.component';

@Component({
  selector: 'app-side-login',
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    TablerIconsModule,
  ],
  templateUrl: './side-login.component.html',
  styleUrls: ['./side-login.component.scss'],
})
export class AppSideLoginComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  private firestoreService = inject(FirestoreService);
  private dialog = inject(MatDialog);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  constructor() {
    // Watch for first login to show sync dialog
    effect(() => {
      if (this.authService.firstLogin() && this.authService.isAuthenticated()) {
        this.showSyncDialog();
      }
    });
  }

  get f() {
    return this.form.controls;
  }

  private async showSyncDialog(): Promise<void> {
    const dialogRef = this.dialog.open(SyncDialogComponent, {
      width: '650px',
      maxWidth: '90vw',
      disableClose: true,
      panelClass: 'sync-dialog-container',
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result && result !== 'cancel') {
      const strategy = result as SyncStrategy;
      if (
        strategy === 'merge' ||
        strategy === 'cloud-to-local' ||
        strategy === 'local-to-cloud'
      ) {
        this.isLoading.set(true);
        try {
          await this.firestoreService.syncOnLogin(strategy);
          console.log(`✓ Sync completed with strategy: ${strategy}`);
        } catch (error) {
          console.error('Sync error:', error);
          this.errorMessage.set(
            'Sync failed, but you can continue using the app.'
          );
        } finally {
          this.isLoading.set(false);
        }
      }
    }

    this.authService.clearFirstLogin();
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithEmail(
        this.form.value.email!,
        this.form.value.password!
      );
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(
        this.authService.error() || 'Login failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(
        this.authService.error() || 'Google sign-in failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async continueAsGuest(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signInAsGuest();
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(
        this.authService.error() || 'Guest sign-in failed. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
