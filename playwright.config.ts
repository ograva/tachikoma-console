import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4200';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // Sequential by default — avoids emulator race conditions
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Clear browser state between tests — ensures no auth/localStorage bleed
    storageState: undefined,
  },

  // Two layouts (owner decision, 2026-11-24). TachikomaChatComponent switches to the landscape roundtable when
  // innerWidth >= 768 && innerWidth > innerHeight (Wireframe_Chat.md "Orientation switch").
  // - portrait: the default. Every test except those tagged @landscape (the transcript-based UI).
  // - landscape: only tests tagged @landscape (roundtable and status-bar behaviour).
  // A CLI --grep (e.g. `npm run test:e2e:smoke`) is ANDed with each project's grep/grepInvert.
  projects: [
    {
      name: 'portrait',
      grepInvert: /@landscape\b/,
      use: {
        ...devices['Pixel 5'], // chromium, isMobile, hasTouch, mobile Chrome user agent
        viewport: { width: 390, height: 844 },
        screen: { width: 390, height: 844 },
      },
    },
    {
      name: 'landscape',
      grep: /@landscape\b/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
