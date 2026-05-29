const PROJECT_ID = "novusinc-8df79";
const FIRESTORE_DB_ID = "tachikoma-chat";

const AUTH_BASE = "http://127.0.0.1:9098";
const FIRESTORE_BASE = "http://127.0.0.1:8085";
const STORAGE_BASE = "http://127.0.0.1:9199";

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assertStatus(response, expectedRange, label, payload) {
  const ok =
    response.status >= expectedRange[0] && response.status <= expectedRange[1];
  if (!ok) {
    throw new Error(
      `${label} failed (${response.status}): ${JSON.stringify(payload ?? {}, null, 2)}`,
    );
  }
}

async function signInAuthEmulator() {
  const url = `${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });

  const payload = await parseJsonSafe(response);
  assertStatus(response, [200, 299], "Auth emulator signUp", payload);

  if (!payload?.idToken || !payload?.localId) {
    throw new Error("Auth emulator signUp returned missing idToken/localId.");
  }

  return { idToken: payload.idToken, uid: payload.localId };
}

async function writeAndReadFirestore(idToken, uid) {
  const docId = `smoke-${Date.now()}`;
  const docPath = `users/${uid}/chat_sessions/${docId}`;
  const docUrl = `${FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/${docPath}`;

  const patchResponse = await fetch(docUrl, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        id: { stringValue: docId },
        updatedAt: { timestampValue: new Date().toISOString() },
        messages: { arrayValue: { values: [] } },
      },
    }),
  });

  const patchPayload = await parseJsonSafe(patchResponse);
  assertStatus(
    patchResponse,
    [200, 299],
    "Firestore emulator write",
    patchPayload,
  );

  const getResponse = await fetch(docUrl, {
    headers: { authorization: `Bearer ${idToken}` },
  });
  const getPayload = await parseJsonSafe(getResponse);
  assertStatus(getResponse, [200, 299], "Firestore emulator read", getPayload);
}

async function checkStorage() {
  const probeResponse = await fetch(`${STORAGE_BASE}/`);
  await parseJsonSafe(probeResponse);
}

async function main() {
  console.log("Running Firebase emulator smoke test...");

  const { idToken, uid } = await signInAuthEmulator();
  console.log(`Auth emulator: OK (uid=${uid})`);

  await writeAndReadFirestore(idToken, uid);
  console.log("Firestore emulator: OK (write/read verified)");

  await checkStorage();
  console.log("Storage emulator: OK (endpoint reachable)");

  console.log(
    "Smoke test passed: Auth + Firestore + Storage emulators are reachable and functional.",
  );
}

main().catch((error) => {
  console.error("Smoke test failed:", error.message);
  process.exit(1);
});
