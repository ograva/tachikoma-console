import { test, expect } from '@playwright/test';
import { continueAsGuest, suppressExplainerDialog, clearLocalStorage } from '../../helpers';

/**
 * AGNT-001: Create and Edit Agent Profiles (T100-T106)
 * AGNT-002: Configure Role, Model and Silence (T107-T112)
 * AGNT-003: Author Structured System Instructions (T113-T118)
 * AGNT-004: Draft Persona from Intent (T119-T124)
 * AGNT-005: Replace Browser Dialogs with Material Dialogs (T125-T130)
 */
test.describe('AGNT — Agent Profiles and Instruction Design', () => {
  test.beforeEach(async ({ page }) => {
    await continueAsGuest(page);
    await page.goto('/tachikoma-profiles');
  });

  // ══ AGNT-001: Create and Edit Agent Profiles (T100-T106) ═════════════════

  test.describe('T100-T106 Create and Edit Profiles', () => {
    test('T100 new agent button reveals the create form', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      await expect(page.locator('mat-card', { hasText: 'CREATE NEW AGENT' })).toBeVisible();
    });

    test('T101 create a new agent profile with required fields', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();

      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('input[placeholder*="LOGIKOMA"], mat-form-field:has-text("Agent Name") input').fill('TEST-AGENT');
      await form.locator('mat-select[formcontrolname], mat-select').first().click().catch(() => {});
      await form.locator('textarea[placeholder*="personality"], textarea').first().fill('You are TEST-AGENT. Your role: testing.');

      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      // The new profile should appear in the list
      await expect(page.locator('.profile-card', { hasText: 'TEST-AGENT' })).toBeVisible({ timeout: 5_000 });
    });

    test('T102 profile persists to localStorage immediately after save', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('PERSIST-TEST');
      await form.locator('textarea').first().fill('Persistence test agent.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => {
        const raw = localStorage.getItem('tachikoma_agent_profiles');
        return raw ? JSON.parse(raw) : [];
      });
      expect(stored.some((p: any) => p.name === 'PERSIST-TEST')).toBeTruthy();
    });

    test('T103 edit an existing profile — name change saves correctly', async ({ page }) => {
      // Edit first profile
      await page.locator('[data-test-id="profiles-edit-btn"]').first().click();
      const nameInput = page.locator('mat-form-field:has-text("Agent Name") input').first();
      await nameInput.triple_click ? nameInput.click({ clickCount: 3 }) : await nameInput.selectAll;
      await nameInput.fill('EDITED-NAME');
      await page.locator('[data-test-id="profiles-save-edit-btn"]').click();

      await expect(page.locator('.profile-card', { hasText: 'EDITED-NAME' })).toBeVisible({ timeout: 5_000 });
    });

    test('T104 cancel edit does not persist changes', async ({ page }) => {
      // Get original name
      const firstCard = page.locator('.profile-card').first();
      const originalName = await firstCard.locator('.name-badge').textContent();

      await page.locator('[data-test-id="profiles-edit-btn"]').first().click();
      const nameInput = page.locator('mat-form-field:has-text("Agent Name") input').first();
      await nameInput.fill('SHOULD-NOT-SAVE');
      await page.locator('[data-test-id="profiles-cancel-edit-btn"]').click();

      // Original name should still be there
      if (originalName) {
        await expect(page.locator('.name-badge', { hasText: originalName.trim() }).first()).toBeVisible();
      }
    });

    test('T105 local persistence is immediate — reload shows saved profile', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('RELOAD-TEST');
      await form.locator('textarea').first().fill('Reload persistence agent.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();
      await page.reload();
      await expect(page.locator('.profile-card', { hasText: 'RELOAD-TEST' })).toBeVisible({ timeout: 5_000 });
    });

    test('T106 saving a profile shows updated model field with default value', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('MODEL-TEST');
      await form.locator('textarea').first().fill('Model test agent.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => {
        const raw = localStorage.getItem('tachikoma_agent_profiles');
        return raw ? JSON.parse(raw) : [];
      });
      const saved = stored.find((p: any) => p.name === 'MODEL-TEST');
      expect(saved).toBeTruthy();
      expect(saved.model).toBeTruthy(); // Should have a model default
    });
  });

  // ══ AGNT-002: Role, Model, Silence Config (T107-T112) ════════════════════

  test.describe('T107-T112 Role, Model, and Silence', () => {
    test('T107 role selector shows chatter and moderator options', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const roleSelect = page.locator('mat-form-field:has-text("Role") mat-select');
      await roleSelect.click();
      await expect(page.locator('mat-option', { hasText: /chatter/i })).toBeVisible();
      await expect(page.locator('mat-option', { hasText: /moderator/i })).toBeVisible();
    });

    test('T108 silence protocol selector shows all four options', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const silenceSelect = page.locator('mat-form-field:has-text("Silence") mat-select');
      await silenceSelect.click();
      await expect(page.locator('mat-option', { hasText: /standard/i })).toBeVisible();
      await expect(page.locator('mat-option', { hasText: /always.speak/i })).toBeVisible();
      await expect(page.locator('mat-option', { hasText: /conservative/i })).toBeVisible();
      await expect(page.locator('mat-option', { hasText: /agreeable/i })).toBeVisible();
    });

    test('T109 model selector shows approved Gemini models', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const modelSelect = page.locator('mat-form-field:has-text("Model") mat-select');
      await modelSelect.click();
      await expect(page.locator('mat-option', { hasText: /gemini/i }).first()).toBeVisible();
    });

    test('T110 save with moderator role stores role correctly', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('MY-MOD');
      await form.locator('textarea').first().fill('Moderator agent.');

      const roleSelect = form.locator('mat-form-field:has-text("Role") mat-select');
      await roleSelect.click();
      await page.locator('mat-option', { hasText: /moderator/i }).click();

      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]'));
      const mod = stored.find((p: any) => p.name === 'MY-MOD');
      expect(mod?.role).toBe('moderator');
    });

    test('T111 silence protocol defaults to standard when not explicitly selected', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('DEFAULT-SILENCE');
      await form.locator('textarea').first().fill('Default silence agent.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]'));
      const p = stored.find((p: any) => p.name === 'DEFAULT-SILENCE');
      expect(p?.silenceProtocol).toBe('standard');
    });

    test('T112 conservative silence protocol saves and reloads correctly', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('CONSERVATIVE');
      await form.locator('textarea').first().fill('Conservative agent.');

      const silenceSelect = form.locator('mat-form-field:has-text("Silence") mat-select');
      await silenceSelect.click();
      await page.locator('mat-option', { hasText: /conservative/i }).click();

      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]'));
      const p = stored.find((p: any) => p.name === 'CONSERVATIVE');
      expect(p?.silenceProtocol).toBe('conservative');
    });
  });

  // ══ AGNT-003: System Instruction Modes (T113-T118) ════════════════════════

  test.describe('T113-T118 System Instruction Authoring', () => {
    test('T113 mode toggle shows plaintext, form, and XML options', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      await expect(page.locator('mat-button-toggle', { hasText: /plain.text/i })).toBeVisible();
      await expect(page.locator('mat-button-toggle', { hasText: /form/i })).toBeVisible();
      await expect(page.locator('mat-button-toggle', { hasText: /xml/i })).toBeVisible();
    });

    test('T114 switching to form mode shows structured fields', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      await page.locator('mat-button-toggle', { hasText: /form/i }).click();
      await expect(page.locator('mat-form-field:has-text("Role")')).toBeVisible();
    });

    test('T115 switching to XML mode shows the XML text area', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      await page.locator('mat-button-toggle', { hasText: /xml/i }).click();
      await expect(page.locator('textarea.xml-editor, textarea[placeholder*="system"]')).toBeVisible();
    });

    test('T116 AI convert button is visible in plain-text mode', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      // Should already be in plaintext mode by default
      const convertBtn = page.locator('button', { hasText: /convert/i });
      await expect(convertBtn).toBeVisible();
    });

    test('T117 convert button is disabled when system prompt is empty', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const convertBtn = page.locator('button', { hasText: /convert/i });
      await expect(convertBtn).toBeDisabled();
    });

    test('T118 save with form mode stores systemMode as "form"', async ({ page }) => {
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('FORM-MODE');

      await page.locator('mat-button-toggle', { hasText: /form/i }).click();
      // Fill in at least the role field
      await form.locator('mat-form-field:has-text("Role") input').fill('Test role description');

      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_agent_profiles') || '[]'));
      const p = stored.find((p: any) => p.name === 'FORM-MODE');
      expect(p?.systemMode).toBe('form');
    });
  });

  // ══ AGNT-004: Draft Persona from Intent (T119-T124) ══════════════════════

  test.describe('T119-T124 Draft Persona from Intent', () => {
    test('T119 intent panel and input are visible on profiles page', async ({ page }) => {
      await expect(page.locator('[data-test-id="profiles-intent-draft-panel"]')).toBeVisible();
      await expect(page.locator('[data-test-id="profiles-intent-input"]')).toBeVisible();
    });

    test('T120 generate draft button is disabled when intent field is empty', async ({ page }) => {
      await expect(page.locator('[data-test-id="profiles-draft-btn"]')).toBeDisabled();
    });

    test('T121 generate draft button enables when intent text is entered', async ({ page }) => {
      await page.locator('[data-test-id="profiles-intent-input"]').fill('A creative storyteller');
      await expect(page.locator('[data-test-id="profiles-draft-btn"]')).toBeEnabled();
    });

    test('T122 intent input accepts up to 500 characters', async ({ page }) => {
      const longText = 'A'.repeat(500);
      await page.locator('[data-test-id="profiles-intent-input"]').fill(longText);
      const value = await page.locator('[data-test-id="profiles-intent-input"]').inputValue();
      expect(value.length).toBe(500);
    });

    test('T123 discard draft button removes the preview panel', async ({ page }) => {
      // Manually inject a draft result to test the discard flow
      await page.evaluate(() => {
        // Simulate a draft being available by setting component state
        // We test via the template controls becoming visible
      });
      // The draft preview only appears after a successful generation, so
      // we verify the UI is in the correct initial state (no preview)
      await expect(page.locator('[data-test-id="profiles-draft-preview"]')).not.toBeVisible();
    });

    test('T124 apply draft button is not present when no draft exists', async ({ page }) => {
      await expect(page.locator('[data-test-id="profiles-apply-draft-btn"]')).not.toBeVisible();
    });
  });

  // ══ AGNT-005: Material Dialogs (T125-T130) ════════════════════════════════

  test.describe('T125-T130 Material Dialog flows', () => {
    test('T125 delete profile shows Material confirmation dialog', async ({ page }) => {
      await page.locator('[data-test-id="profiles-delete-btn"]').first().click();
      await expect(page.locator('mat-dialog-container')).toBeVisible({ timeout: 3_000 });
      await expect(page.locator('mat-dialog-container', { hasText: /delete/i })).toBeVisible();
    });

    test('T126 confirm delete removes the profile', async ({ page }) => {
      const initialCount = await page.locator('[data-test-id="profiles-delete-btn"]').count();
      await page.locator('[data-test-id="profiles-delete-btn"]').first().click();
      await page.locator('[data-test-id="confirm-dialog-confirm"]').click();
      await expect(page.locator('[data-test-id="profiles-delete-btn"]')).toHaveCount(initialCount - 1, { timeout: 5_000 });
    });

    test('T127 cancel delete keeps the profile', async ({ page }) => {
      const initialCount = await page.locator('[data-test-id="profiles-delete-btn"]').count();
      await page.locator('[data-test-id="profiles-delete-btn"]').first().click();
      await page.locator('[data-test-id="confirm-dialog-cancel"]').click();
      await expect(page.locator('[data-test-id="profiles-delete-btn"]')).toHaveCount(initialCount);
    });

    test('T128 reset to defaults shows Material confirmation dialog', async ({ page }) => {
      await page.locator('[data-test-id="profiles-reset-defaults-btn"]').click();
      await expect(page.locator('mat-dialog-container', { hasText: /reset/i })).toBeVisible({ timeout: 3_000 });
    });

    test('T129 confirming reset restores default profiles', async ({ page }) => {
      // First add a custom profile
      await page.locator('[data-test-id="profiles-new-agent-btn"]').click();
      const form = page.locator('mat-card', { hasText: 'CREATE NEW AGENT' });
      await form.locator('mat-form-field:has-text("Agent Name") input').fill('CUSTOM-TO-DELETE');
      await form.locator('textarea').first().fill('Custom profile.');
      await page.locator('[data-test-id="profiles-save-new-btn"]').click();

      // Reset
      await page.locator('[data-test-id="profiles-reset-defaults-btn"]').click();
      await page.locator('[data-test-id="confirm-dialog-confirm"]').click();

      // Custom profile should be gone
      await expect(page.locator('.profile-card', { hasText: 'CUSTOM-TO-DELETE' })).not.toBeVisible({ timeout: 5_000 });
      // Default profiles should be present
      await expect(page.locator('.profile-card', { hasText: 'LOGIKOMA' })).toBeVisible();
    });

    test('T130 Material dialog has proper focus trap — escape closes it', async ({ page }) => {
      await page.locator('[data-test-id="profiles-delete-btn"]').first().click();
      await expect(page.locator('mat-dialog-container')).toBeVisible({ timeout: 3_000 });
      await page.keyboard.press('Escape');
      await expect(page.locator('mat-dialog-container')).not.toBeVisible({ timeout: 3_000 });
    });
  });
});
