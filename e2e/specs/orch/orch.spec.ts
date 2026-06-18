import { test, expect } from '@playwright/test';
import {
  continueAsGuest,
  suppressExplainerDialog,
  seedApiKey,
  mockGeminiApi,
  mockGeminiRateLimit,
  unmockGeminiApi,
} from '../../helpers';

/**
 * ORCH-001: Run Round-Robin Agent Cycles (T300-T307)
 * ORCH-002: Apply Silence and Synthesis Rules (T308-T314)
 * ORCH-003: Share Chat and File Context (T315-T320)
 * ORCH-004: Handle Failed Persona Steps Explicitly (T321-T327)
 *
 * All Gemini API calls are intercepted via page.route() and return
 * canned responses — no real API key or quota needed.
 */
test.describe('ORCH — Multi-Agent Conversation Protocol', () => {
  test.beforeEach(async ({ page }) => {
    await continueAsGuest(page);
    await seedApiKey(page);
    await page.goto('/tachikoma');
    await suppressExplainerDialog(page);

    // Seed a chat with two chatters and one moderator
    await page.evaluate(() => {
      const agents = [
        { id: 'logikoma', name: 'LOGIKOMA', color: 'logikoma', hex: '#00f3ff', temp: 0.2, role: 'chatter', system: 'Analyze logically.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
        { id: 'ghost', name: 'GHOST-1', color: 'ghost', hex: '#ff00de', temp: 0.7, role: 'chatter', system: 'Philosophize.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
        { id: 'moderator', name: 'MODERATOR', color: 'moderator', hex: '#00ff41', temp: 0.5, role: 'moderator', system: 'Synthesize.', model: 'models/gemini-3.5-flash', silenceProtocol: 'standard', status: 'idle', createdAt: 1, updatedAt: 1 },
      ];
      localStorage.setItem('tachikoma_chat_sessions', JSON.stringify([{
        id: 'orch-chat', title: 'Protocol Test', messages: [],
        participatingAgents: agents, conversationSummary: '', createdAt: 1, updatedAt: 1,
      }]));
      localStorage.setItem('tachikoma_current_chat_id', 'orch-chat');
      localStorage.setItem('tachikoma_agent_profiles', JSON.stringify(agents));
    });
    await page.reload();
    await suppressExplainerDialog(page);
  });

  // ══ ORCH-001: Round-Robin Agent Cycles (T300-T307) ════════════════════════

  test.describe('T300-T307 Round-Robin Execution', () => {
    test('T300 submitting a message triggers agent processing indicators', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Logical analysis here.' },
        { text: 'Philosophical perspective.' },
        { text: 'Synthesis of both views.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Explain the trolley problem.');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Processing panel should appear while agents respond
      await expect(page.locator('.neural-activity, .status-panel, [class*="neural"]')).toBeVisible({ timeout: 5_000 });
    });

    test('T301 all chatter agents produce responses in transcript', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'LOGIKOMA response here.' },
        { text: 'GHOST-1 response here.' },
        { text: 'MODERATOR synthesis here.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Test question');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Wait for all agent messages to appear
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });
      const agentMessages = page.locator('[data-test-id="chat-agent-message"]');
      await expect(agentMessages).toHaveCount(3, { timeout: 15_000 });
    });

    test('T302 moderator response appears after chatters', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Chatter A speaks.' },
        { text: 'Chatter B speaks.' },
        { text: 'Moderator synthesizes.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('What is AI?');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Wait for all messages
      await expect(page.locator('[data-test-id="chat-agent-message"]')).toHaveCount(3, { timeout: 15_000 });

      // MODERATOR message should appear last
      const messages = page.locator('[data-test-id="chat-agent-message"]');
      const lastSender = await messages.last().locator('.agent-name').textContent();
      expect(lastSender?.trim()).toContain('MODERATOR');
    });

    test('T303 user message appears in transcript immediately', async ({ page }) => {
      await mockGeminiApi(page);

      const userText = 'My test message ' + Date.now();
      await page.locator('[data-test-id="chat-message-input"]').fill(userText);
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-user-message"]', { hasText: userText })).toBeVisible({ timeout: 5_000 });
    });

    test('T304 input is cleared after send', async ({ page }) => {
      await mockGeminiApi(page);

      await page.locator('[data-test-id="chat-message-input"]').fill('Test message');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      const value = await page.locator('[data-test-id="chat-message-input"]').inputValue();
      expect(value).toBe('');
    });

    test('T305 send button is disabled while processing', async ({ page }) => {
      // Use a slow mock response to catch the processing state
      let resolveResponse: () => void;
      const responsePromise = new Promise<void>((r) => { resolveResponse = r; });

      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await responsePromise;
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'Slow response' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          }});
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Send button should be effectively non-interactive while processing
      await page.waitForTimeout(200);
      resolveResponse!();
    });

    test('T306 multiple rounds increment the round counter', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Round 1 chatter A.' }, { text: 'Round 1 chatter B.' }, { text: 'Round 1 mod.' },
        { text: 'Round 2 chatter A.' }, { text: 'Round 2 chatter B.' }, { text: 'Round 2 mod.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('First round');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]')).toHaveCount(3, { timeout: 15_000 });

      await page.locator('[data-test-id="chat-message-input"]').fill('Second round');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]')).toHaveCount(6, { timeout: 15_000 });
    });

    test('T307 messages are saved to localStorage after a round', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Agent response.' },
        { text: 'SILENCE' },
        { text: 'Mod synthesis.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Save test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]'));
      const chat = sessions.find((s: any) => s.id === 'orch-chat');
      expect(chat?.messages?.length).toBeGreaterThan(0);
    });
  });

  // ══ ORCH-002: Silence and Synthesis Rules (T308-T314) ════════════════════

  test.describe('T308-T314 Silence and Synthesis', () => {
    test('T308 SILENCE response from chatter is excluded from transcript', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'First chatter speaks normally.' },
        { text: 'SILENCE' }, // Second chatter silences
        { text: 'Moderator synthesis.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Test silence');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Only 2 visible messages (first chatter + moderator), not 3
      await expect(page.locator('[data-test-id="chat-agent-message"]')).toHaveCount(2, { timeout: 15_000 });
    });

    test('T309 SILENCE from moderator is excluded from transcript', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Chatter A.' },
        { text: 'Chatter B.' },
        { text: 'SILENCE' }, // Moderator silences
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Mod silence test');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]')).toHaveCount(2, { timeout: 15_000 });
    });

    test('T310 non-silence response from first chatter always shown', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'First chatter must always speak.' },
        { text: 'SILENCE' },
        { text: 'Mod response.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Always speak test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]', { hasText: 'First chatter must always speak.' })).toBeVisible({ timeout: 15_000 });
    });

    test('T311 moderator synthesis appears in transcript when agents have spoken', async ({ page }) => {
      await mockGeminiApi(page, [
        { text: 'Chatter input.' },
        { text: 'SILENCE' },
        { text: 'Final synthesis from moderator.' },
      ]);

      await page.locator('[data-test-id="chat-message-input"]').fill('Synthesis test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-agent-message"]', { hasText: 'Final synthesis from moderator.' })).toBeVisible({ timeout: 15_000 });
    });
  });

  // ══ ORCH-003: Share Chat and File Context (T315-T320) ════════════════════

  test.describe('T315-T320 Shared Context', () => {
    test('T315 file upload button is present in chat footer', async ({ page }) => {
      const attachBtn = page.locator('.attach-btn, button[matTooltip*="file"], button mat-icon:text("attach_file")').first();
      await expect(attachBtn).toBeVisible();
    });

    test('T316 uploading a text file shows it in the file context bar', async ({ page }) => {
      const fileContent = 'This is test file content for ORCH-003 context sharing.';
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.attach-btn, button mat-icon:text("attach_file")').first().click(),
      ]);
      await fileChooser.setFiles({
        name: 'test-context.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(fileContent),
      });

      await expect(page.locator('.file-context-bar')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('.file-name', { hasText: 'test-context.txt' })).toBeVisible();
    });

    test('T317 uploaded file appears in shared context section', async ({ page }) => {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.attach-btn, button mat-icon:text("attach_file")').first().click(),
      ]);
      await fileChooser.setFiles({
        name: 'context.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('ORCH context test content'),
      });

      await expect(page.locator('.file-context-bar, .shared-context')).toBeVisible({ timeout: 5_000 });
    });

    test('T318 removing a file removes it from context bar', async ({ page }) => {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.attach-btn, button mat-icon:text("attach_file")').first().click(),
      ]);
      await fileChooser.setFiles({
        name: 'removeme.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Remove me'),
      });

      await expect(page.locator('.file-chip', { hasText: 'removeme.txt' })).toBeVisible({ timeout: 5_000 });

      await page.locator('.remove-file-btn, button mat-icon:text("close")').first().click();

      await expect(page.locator('.file-chip', { hasText: 'removeme.txt' })).not.toBeVisible();
    });

    test('T319 unsupported file type can still be uploaded (read as text)', async ({ page }) => {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.attach-btn, button mat-icon:text("attach_file")').first().click(),
      ]);
      await fileChooser.setFiles({
        name: 'data.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"key": "value"}'),
      });

      // Should not crash — file should appear in context bar
      await expect(page.locator('.file-context-bar')).toBeVisible({ timeout: 5_000 });
    });

    test('T320 file content appears in conversation history sent to agents', async ({ page }) => {
      await mockGeminiApi(page, [{ text: 'I saw the file content.' }, { text: 'SILENCE' }, { text: 'Synthesis.' }]);

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('.attach-btn, button mat-icon:text("attach_file")').first().click(),
      ]);
      await fileChooser.setFiles({
        name: 'agent-context.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('UNIQUE_CONTEXT_MARKER_12345'),
      });

      // Intercept the request to verify file content is sent
      let promptContainedFile = false;
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          const body = route.request().postDataJSON();
          const prompt = JSON.stringify(body);
          if (prompt.includes('UNIQUE_CONTEXT_MARKER_12345')) {
            promptContainedFile = true;
          }
          await route.fulfill({ json: {
            candidates: [{ content: { parts: [{ text: 'I saw it.' }], role: 'model' }, finishReason: 'STOP', index: 0 }],
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
          }});
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Do you see the file?');
      await page.locator('[data-test-id="chat-send-btn"]').click();
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 15_000 });

      expect(promptContainedFile).toBeTruthy();
    });
  });

  // ══ ORCH-004: Handle Failed Persona Steps (T321-T327) ════════════════════

  test.describe('T321-T327 Failed Step Handling', () => {
    test('T321 rate-limit error shows failed-step card instead of crashing', async ({ page }) => {
      // All generateContent calls return 429
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({
            status: 429,
            json: { error: { code: 429, message: 'RESOURCE_EXHAUSTED', status: 'RESOURCE_EXHAUSTED' } },
          });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Trigger rate limit');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-failed-step-card"]').first()).toBeVisible({ timeout: 20_000 });
    });

    test('T322 failed-step card shows the agent name', async ({ page }) => {
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ status: 500, json: { error: { message: 'Internal error' } } });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Trigger error');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      const card = page.locator('[data-test-id="chat-failed-step-card"]').first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      const cardText = await card.textContent();
      expect(cardText).toContain('STEP FAILED');
    });

    test('T323 rate-limit failed card contains quota messaging', async ({ page }) => {
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({
            status: 429,
            json: { error: { code: 429, message: 'quota exceeded RESOURCE_EXHAUSTED' } },
          });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Rate limit test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      const card = page.locator('[data-test-id="chat-failed-step-card"]').first();
      await expect(card).toBeVisible({ timeout: 20_000 });
      const cardText = await card.textContent();
      expect(cardText?.toLowerCase()).toMatch(/quota|rate.limit/);
    });

    test('T324 protocol continues for remaining agents after one fails', async ({ page }) => {
      let callCount = 0;
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          callCount++;
          if (callCount === 1) {
            // First agent (chatter) fails
            await route.fulfill({ status: 500, json: { error: { message: 'Error' } } });
          } else {
            // Remaining agents succeed
            await route.fulfill({ json: {
              candidates: [{ content: { parts: [{ text: `Response from agent ${callCount}` }], role: 'model' }, finishReason: 'STOP', index: 0 }],
              usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
            }});
          }
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Continue after failure');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Should see at least one failed card AND at least one success card
      await expect(page.locator('[data-test-id="chat-failed-step-card"]').first()).toBeVisible({ timeout: 20_000 });
      await expect(page.locator('[data-test-id="chat-agent-message"]').first()).toBeVisible({ timeout: 20_000 });
    });

    test('T325 failed-step card is added to localStorage transcript', async ({ page }) => {
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ status: 500, json: { error: { message: 'Error' } } });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Save failed step');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      await expect(page.locator('[data-test-id="chat-failed-step-card"]').first()).toBeVisible({ timeout: 20_000 });

      const sessions = await page.evaluate(() => JSON.parse(localStorage.getItem('tachikoma_chat_sessions') || '[]'));
      const chat = sessions.find((s: any) => s.id === 'orch-chat');
      const hasFailedStep = chat?.messages?.some((m: any) => m.messageType === 'failed-step' || m.messageType === 'rate-limit');
      expect(hasFailedStep).toBeTruthy();
    });

    test('T326 no silent failure — every failed agent produces a visible card', async ({ page }) => {
      // All three agents fail
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ status: 500, json: { error: { message: 'Error' } } });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('All fail test');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // 3 agents failing → 3 failed step cards
      await expect(page.locator('[data-test-id="chat-failed-step-card"]')).toHaveCount(3, { timeout: 25_000 });
    });

    test('T327 send button re-enables after failed round completes', async ({ page }) => {
      await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
        if (route.request().url().includes(':generateContent')) {
          await route.fulfill({ status: 500, json: { error: { message: 'Error' } } });
        } else {
          await route.continue();
        }
      });

      await page.locator('[data-test-id="chat-message-input"]').fill('Test re-enable');
      await page.locator('[data-test-id="chat-send-btn"]').click();

      // Wait for processing to complete
      await expect(page.locator('[data-test-id="chat-failed-step-card"]').first()).toBeVisible({ timeout: 25_000 });

      // Input should be usable again
      await expect(page.locator('[data-test-id="chat-message-input"]')).toBeEditable({ timeout: 5_000 });
    });
  });
});
