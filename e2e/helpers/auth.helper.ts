import { Page } from '@playwright/test';

export const EMULATOR_AUTH_BASE = 'http://127.0.0.1:9098';
export const EMULATOR_FIRESTORE_BASE = 'http://127.0.0.1:8085';
export const PROJECT_ID = 'novusinc-8df79';
export const FIRESTORE_DB_ID = 'tachikoma-chat';

/** Test account seeded into emulators via emulator-seed.mjs */
export const SEED_USER = {
  email: 'seed-user@tachikoma.local',
  password: 'password123',
};

/** Sign in with email/password via the UI login form. */
export async function signInWithEmail(
  page: Page,
  email = SEED_USER.email,
  password = SEED_USER.password
): Promise<void> {
  await page.goto('/authentication/login');
  await page.locator('[data-test-id="auth-email-input"]').fill(email);
  await page.locator('[data-test-id="auth-password-input"]').fill(password);
  await page.locator('[data-test-id="auth-signin-submit-btn"]').click();
  // Wait until redirect away from login page
  await page.waitForURL((url) => !url.pathname.includes('/authentication'), { timeout: 10_000 });
}

/** Continue without signing in (anonymous/guest mode). */
export async function continueAsGuest(page: Page): Promise<void> {
  await page.goto('/authentication/login');
  await page.locator('[data-test-id="auth-guest-btn"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/authentication'), { timeout: 10_000 });
}

/** Sign out via the header profile menu. */
export async function signOut(page: Page): Promise<void> {
  // Open profile menu in header
  const profileBtn = page.locator('button[aria-label="Profile"], button mat-icon:text("account_circle")').first();
  await profileBtn.click();
  const logoutBtn = page.locator('button', { hasText: /logout|sign out/i }).first();
  await logoutBtn.click();
  await page.waitForURL(/authentication/, { timeout: 8_000 });
}

/**
 * Create a test user directly in the Auth emulator REST API.
 * Returns { uid, idToken } for use in Firestore seeding.
 */
export async function createEmulatorUser(
  email: string,
  password: string
): Promise<{ uid: string; idToken: string }> {
  const url = `${EMULATOR_AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.localId) throw new Error(`Failed to create emulator user: ${JSON.stringify(data)}`);
  return { uid: data.localId, idToken: data.idToken };
}

/** Clear all emulator Auth users (between test runs). */
export async function clearEmulatorAuth(): Promise<void> {
  await fetch(
    `${EMULATOR_AUTH_BASE}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );
}

/** Clear all Firestore emulator data for a user (between test runs). */
export async function clearEmulatorFirestoreUser(uid: string): Promise<void> {
  const base = `${EMULATOR_FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents`;
  // Delete user document tree
  const collections = ['user_profile', 'agent_profiles', 'chat_sessions'];
  for (const col of collections) {
    await fetch(`${base}/users/${uid}/${col}`, { method: 'DELETE' }).catch(() => {});
  }
}
