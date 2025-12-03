import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from '../../material.module';
import { CommonModule } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';

@Component({
  selector: 'app-chat-explainer-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  template: `
    <div class="explainer-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <i-tabler name="message-chatbot" class="icon-32 m-r-12"></i-tabler>
        Welcome to Multi-Agent Chat
      </h2>

      <mat-dialog-content class="dialog-content">
        <div class="intro-section">
          <p class="lead-text">
            Experience collaborative AI intelligence through multiple personas
            working together to answer your questions.
          </p>
        </div>

        <div class="how-it-works">
          <h3 class="section-title">
            <i-tabler name="settings" class="icon-20 m-r-8"></i-tabler>
            How It Works
          </h3>

          <div class="step">
            <span class="step-number">1</span>
            <div class="step-content">
              <h4>You Ask a Question</h4>
              <p>
                Type your query in the chat input at the bottom of the screen.
              </p>
            </div>
          </div>

          <div class="step">
            <span class="step-number">2</span>
            <div class="step-content">
              <h4>Agents Respond in Sequence</h4>
              <p>
                Each selected AI agent analyzes your question with their unique
                perspective:
              </p>
              <div class="agent-badges">
                <span class="agent-badge logikoma">
                  <i-tabler name="brain" class="icon-16"></i-tabler>
                  Logikoma - Logic & Data
                </span>
                <span class="agent-badge ghost">
                  <i-tabler name="ghost" class="icon-16"></i-tabler>
                  Ghost-1 - Philosophy
                </span>
                <span class="agent-badge moderator">
                  <i-tabler name="shield-check" class="icon-16"></i-tabler>
                  Moderator - Synthesis
                </span>
              </div>
            </div>
          </div>

          <div class="step">
            <span class="step-number">3</span>
            <div class="step-content">
              <h4>Get Comprehensive Answers</h4>
              <p>
                Each agent reads previous responses and adds unique insights
                using the SILENCE PROTOCOL - they only speak if they have
                something new to contribute.
              </p>
            </div>
          </div>
        </div>

        <div class="features-section">
          <h3 class="section-title">
            <i-tabler name="stars" class="icon-20 m-r-8"></i-tabler>
            Key Features
          </h3>

          <div class="feature-grid">
            <div class="feature-item">
              <i-tabler
                name="adjustments-alt"
                class="icon-20 text-primary"
              ></i-tabler>
              <span>Customize agents in Tachikomas page</span>
            </div>
            <div class="feature-item">
              <i-tabler name="history" class="icon-20 text-primary"></i-tabler>
              <span>View conversation history (side panel)</span>
            </div>
            <div class="feature-item">
              <i-tabler
                name="file-export"
                class="icon-20 text-primary"
              ></i-tabler>
              <span>Export chats as PDF or DOCX</span>
            </div>
            <div class="feature-item">
              <i-tabler name="upload" class="icon-20 text-primary"></i-tabler>
              <span>Upload files for context analysis</span>
            </div>
          </div>
        </div>

        <div class="tip-box">
          <i-tabler name="bulb" class="icon-20 text-warning"></i-tabler>
          <div>
            <strong>Pro Tip:</strong> Enter your Gemini API key in settings (top
            right) to get started. Your key is stored locally in your browser.
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="close()" class="text-muted">
          Don't show again
        </button>
        <button mat-flat-button color="primary" (click)="close()">
          Got it, let's start!
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .explainer-dialog {
        max-width: 600px;
      }

      .dialog-title {
        display: flex;
        align-items: center;
        font-size: 24px;
        font-weight: 700;
        color: #00f3ff;
        padding: 24px 24px 16px;
        margin: 0;
      }

      .dialog-content {
        padding: 0 24px 24px;
        max-height: 70vh;
        overflow-y: auto;
      }

      .intro-section {
        margin-bottom: 24px;
      }

      .lead-text {
        font-size: 16px;
        line-height: 1.6;
        color: #e0e0e0;
        margin: 0;
      }

      .how-it-works,
      .features-section {
        margin-bottom: 24px;
      }

      .section-title {
        display: flex;
        align-items: center;
        font-size: 18px;
        font-weight: 600;
        color: #00f3ff;
        margin-bottom: 16px;
      }

      .step {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;
        align-items: flex-start;
      }

      .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00f3ff 0%, #00d4ff 100%);
        color: #0a0a0a;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }

      .step-content h4 {
        font-size: 15px;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 8px 0;
      }

      .step-content p {
        font-size: 14px;
        color: #b0b0b0;
        margin: 0;
        line-height: 1.5;
      }

      .agent-badges {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
      }

      .agent-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        border: 1px solid;
      }

      .agent-badge.logikoma {
        background: rgba(0, 243, 255, 0.1);
        border-color: rgba(0, 243, 255, 0.3);
        color: #00f3ff;
      }

      .agent-badge.ghost {
        background: rgba(255, 0, 222, 0.1);
        border-color: rgba(255, 0, 222, 0.3);
        color: #ff00de;
      }

      .agent-badge.moderator {
        background: rgba(0, 255, 65, 0.1);
        border-color: rgba(0, 255, 65, 0.3);
        color: #00ff41;
      }

      .feature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .feature-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(0, 243, 255, 0.05);
        border: 1px solid rgba(0, 243, 255, 0.15);
        border-radius: 8px;
        font-size: 13px;
        color: #e0e0e0;
      }

      .tip-box {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(255, 193, 7, 0.1);
        border: 1px solid rgba(255, 193, 7, 0.3);
        border-radius: 8px;
        font-size: 14px;
        color: #e0e0e0;
        align-items: flex-start;
      }

      .tip-box strong {
        color: #ffc107;
      }

      .dialog-actions {
        padding: 16px 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      @media (max-width: 600px) {
        .feature-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ChatExplainerDialogComponent {
  constructor(public dialogRef: MatDialogRef<ChatExplainerDialogComponent>) {}

  close(): void {
    this.dialogRef.close();
  }
}
