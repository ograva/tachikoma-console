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

// ── Firestore emulator REST seeding (SYNC-002 cross-device restore) ─────────

type FirestoreRestValue = Record<string, unknown>;

function toFirestoreValue(value: unknown): FirestoreRestValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) fields[k] = toFirestoreValue(v);
  return { mapValue: { fields } };
}

function fromFirestoreValue(value: any): unknown {
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('stringValue' in value) return value.stringValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue);
  if ('mapValue' in value) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields ?? {})) out[k] = fromFirestoreValue(v);
    return out;
  }
  return undefined;
}

function userCollectionUrl(uid: string, collectionName: string): string {
  return `${EMULATOR_FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/users/${uid}/${collectionName}`;
}

/**
 * Write a document to `/users/{uid}/{collection}/{docId}` in the Firestore emulator,
 * bypassing security rules (emulator "owner" token). Simulates data written by another device.
 */
export async function seedEmulatorFirestoreDoc(
  uid: string,
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
): Promise<void> {
  const fields: Record<string, FirestoreRestValue> = {};
  for (const [k, v] of Object.entries({ ...data, userId: uid })) fields[k] = toFirestoreValue(v);
  const res = await fetch(`${userCollectionUrl(uid, collectionName)}/${encodeURIComponent(docId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Failed to seed ${collectionName}/${docId}: ${res.status} ${await res.text()}`);
}

/** Read every document in `/users/{uid}/{collection}` from the Firestore emulator as plain objects. */
export async function getEmulatorFirestoreDocs<T = Record<string, unknown>>(
  uid: string,
  collectionName: string
): Promise<T[]> {
  const res = await fetch(`${userCollectionUrl(uid, collectionName)}?pageSize=300`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (!res.ok) throw new Error(`Failed to read ${collectionName}: ${res.status} ${await res.text()}`);
  const body = await res.json();
  return (body.documents ?? []).map((d: any) => fromFirestoreValue({ mapValue: { fields: d.fields ?? {} } }) as T);
}

/** Create a uniquely named emulator user so cross-device tests never share cloud state. */
export async function createUniqueEmulatorUser(
  tag: string,
  password = SEED_USER.password
): Promise<{ uid: string; email: string; password: string }> {
  const email = `${tag.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@tachikoma.local`;
  const { uid } = await createEmulatorUser(email, password);
  return { uid, email, password };
}

export type SyncDialogChoice = 'merge' | 'cloud-to-local' | 'local-to-cloud' | 'skip';

/**
 * Resolve the first-login sync dialog (AUTH-003) with the given choice.
 * Waits for the dialog to appear, clicks the option, and waits for it to close.
 */
export async function resolveSyncDialog(page: Page, choice: SyncDialogChoice): Promise<void> {
  const dialog = page.locator('[data-test-id="sync-dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  const target = choice === 'skip' ? 'sync-skip-btn' : `sync-option-${choice}`;
  await page.locator(`[data-test-id="${target}"]`).click();
  await dialog.waitFor({ state: 'hidden', timeout: 10_000 });
}
