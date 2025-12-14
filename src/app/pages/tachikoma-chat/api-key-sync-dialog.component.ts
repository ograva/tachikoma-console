import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-api-key-sync-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="api-key-sync-dialog">
      <h2 mat-dialog-title>Save API Key to Profile?</h2>
      <mat-dialog-content>
        <p>
          We found a Gemini API key in your browser's local storage.
        </p>
        <p>
          Would you like to save it to your user profile so it's available across all your devices?
        </p>
        <p class="note">
          <strong>Note:</strong> This will securely sync your API key to your account.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="decline()">No, Keep Local Only</button>
        <button mat-raised-button color="primary" (click)="accept()">
          Yes, Save to Profile
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .api-key-sync-dialog {
      padding: 16px;
    }

    h2 {
      margin: 0 0 16px 0;
      color: #00ff41;
      font-family: 'Share Tech Mono', monospace;
    }

    p {
      margin: 0 0 12px 0;
      line-height: 1.6;
    }

    .note {
      font-size: 0.9em;
      color: #00f3ff;
      padding: 12px;
      background: rgba(0, 243, 255, 0.1);
      border-left: 3px solid #00f3ff;
      border-radius: 4px;
    }

    mat-dialog-actions {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
  `]
})
export class ApiKeySyncDialogComponent {
  constructor(private dialogRef: MatDialogRef<ApiKeySyncDialogComponent>) {}

  accept(): void {
    this.dialogRef.close(true);
  }

  decline(): void {
    this.dialogRef.close(false);
  }
}
