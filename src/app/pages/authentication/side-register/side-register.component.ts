import { Component, inject, signal } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-side-register',
  imports: [RouterModule, MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './side-register.component.html',
})
export class AppSideRegisterComponent {
  private settings = inject(CoreService);
  private router = inject(Router);
  private authService = inject(AuthService);

  options = this.settings.getOptions();
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.registerWithEmail(
        this.form.value.email!,
        this.form.value.password!
      );
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage.set(this.authService.error() || 'Registration failed. Please try again.');
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
      this.errorMessage.set(this.authService.error() || 'Google sign-in failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
