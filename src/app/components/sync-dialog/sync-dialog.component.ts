import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type SyncStrategy =
  | 'merge'
  | 'cloud-to-local'
  | 'local-to-cloud'
  | 'cancel';

@Component({
  selector: 'app-sync-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="sync-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon class="title-icon">cloud_sync</mat-icon>
        Sync Your Data
      </h2>

      <mat-dialog-content class="dialog-content">
        <div class="info-section">
          <p class="main-text">
            You have local data on this device. How would you like to sync with
            the cloud?
          </p>
        </div>

        <div class="options-grid">
          <div class="option-card" (click)="selectOption('merge')">
            <div class="option-icon merge-icon">
              <mat-icon>merge</mat-icon>
            </div>
            <h3>Merge Data</h3>
            <p>
              Combine local and cloud data. Keeps the newest version of each
              item.
            </p>
            <span class="recommended-badge">Recommended</span>
          </div>

          <div class="option-card" (click)="selectOption('cloud-to-local')">
            <div class="option-icon cloud-icon">
              <mat-icon>cloud_download</mat-icon>
            </div>
            <h3>Use Cloud Data</h3>
            <p>
              Replace local data with what's in the cloud. Local changes will be
              discarded.
            </p>
          </div>

          <div class="option-card" (click)="selectOption('local-to-cloud')">
            <div class="option-icon local-icon">
              <mat-icon>cloud_upload</mat-icon>
            </div>
            <h3>Use Local Data</h3>
            <p>Upload local data to cloud. Cloud data will be replaced.</p>
          </div>
        </div>

        <div class="warning-section">
          <mat-icon class="warning-icon">info</mat-icon>
          <p>This includes chat history, agent profiles, and settings.</p>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-stroked-button (click)="cancel()" class="cancel-btn">
          Skip for Now
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .sync-dialog {
        font-family: 'JetBrains Mono', monospace;
        color: #e0e0e0;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 24px;
        font-weight: 600;
        color: #00ff41;
        margin: 0 0 16px 0;
        padding: 20px 24px 0;
      }

      .title-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .dialog-content {
        padding: 0 24px 20px;
        max-width: 600px;
      }

      .info-section {
        margin-bottom: 24px;
      }

      .main-text {
        font-size: 16px;
        line-height: 1.6;
        color: #b0b0b0;
        margin: 0;
      }

      .options-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .option-card {
        background: rgba(26, 26, 46, 0.6);
        border: 2px solid rgba(0, 255, 65, 0.3);
        border-radius: 8px;
        padding: 20px 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        text-align: center;
      }

      .option-card:hover {
        border-color: #00ff41;
        background: rgba(0, 255, 65, 0.1);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 255, 65, 0.2);
      }

      .option-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .option-icon mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .merge-icon {
        background: rgba(0, 255, 65, 0.2);
        color: #00ff41;
      }

      .cloud-icon {
        background: rgba(0, 243, 255, 0.2);
        color: #00f3ff;
      }

      .local-icon {
        background: rgba(255, 0, 222, 0.2);
        color: #ff00de;
      }

      .option-card h3 {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .option-card p {
        font-size: 13px;
        line-height: 1.4;
        color: #909090;
        margin: 0;
      }

      .recommended-badge {
        display: inline-block;
        margin-top: 12px;
        padding: 4px 12px;
        background: rgba(0, 255, 65, 0.2);
        color: #00ff41;
        border: 1px solid #00ff41;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .warning-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: rgba(255, 165, 0, 0.1);
        border: 1px solid rgba(255, 165, 0, 0.3);
        border-radius: 6px;
      }

      .warning-icon {
        color: #ffa500;
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .warning-section p {
        font-size: 13px;
        color: #d0d0d0;
        margin: 0;
      }

      .dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        justify-content: center;
      }

      .cancel-btn {
        color: #909090;
        border-color: rgba(144, 144, 144, 0.5);
      }

      .cancel-btn:hover {
        background: rgba(144, 144, 144, 0.1);
        border-color: #909090;
      }

      @media (max-width: 768px) {
        .options-grid {
          grid-template-columns: 1fr;
        }

        .dialog-content {
          max-width: 100%;
        }
      }
    `,
  ],
})
export class SyncDialogComponent {
  private dialogRef = inject(MatDialogRef<SyncDialogComponent>);

  selectOption(strategy: SyncStrategy): void {
    this.dialogRef.close(strategy);
  }

  cancel(): void {
    this.dialogRef.close('cancel');
  }
}
