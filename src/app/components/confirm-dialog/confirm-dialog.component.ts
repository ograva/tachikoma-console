import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
  /** If true, renders as an info/alert dialog with only a dismiss button */
  alertOnly?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog" role="dialog" [attr.aria-labelledby]="'dialog-title'" [attr.aria-describedby]="'dialog-message'">
      <h2 mat-dialog-title id="dialog-title">{{ data.title }}</h2>
      <mat-dialog-content>
        <p id="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button
          *ngIf="!data.alertOnly"
          mat-stroked-button
          [mat-dialog-close]="false"
          data-test-id="confirm-dialog-cancel"
          cdkFocusInitial>
          {{ data.cancelLabel || 'CANCEL' }}
        </button>
        <button
          mat-raised-button
          [color]="data.confirmColor || 'primary'"
          [mat-dialog-close]="true"
          data-test-id="confirm-dialog-confirm">
          {{ data.confirmLabel || (data.alertOnly ? 'OK' : 'CONFIRM') }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog { min-width: 300px; max-width: 480px; }
    mat-dialog-content p { margin: 0; line-height: 1.6; }
    mat-dialog-actions { gap: 8px; padding: 16px 24px; }
  `],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
