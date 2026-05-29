const PROJECT_ID = "novusinc-8df79";
const FIRESTORE_DB_ID = "tachikoma-chat";
const AUTH_BASE = "http://127.0.0.1:9098";
const FIRESTORE_BASE = "http://127.0.0.1:8085";

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function assertOk(response, label, payload) {
  if (!response.ok) {
    throw new Error(
      `${label} failed (${response.status}): ${JSON.stringify(payload ?? {}, null, 2)}`,
    );
  }
}

async function createEmulatorUser() {
  const url = `${AUTH_BASE}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });

  const payload = await parseJsonSafe(response);
  assertOk(response, "Auth seed user creation", payload);

  if (!payload?.localId || !payload?.idToken) {
    throw new Error(
      "Auth seed user creation returned missing localId/idToken.",
    );
  }

  return { uid: payload.localId, idToken: payload.idToken };
}

async function writeDoc(uid, idToken, collectionName, docId, fields) {
  const url = `${FIRESTORE_BASE}/v1/projects/${PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/users/${uid}/${collectionName}/${docId}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });

  const payload = await parseJsonSafe(response);
  assertOk(response, `Firestore seed ${collectionName}/${docId}`, payload);
}

function stringValue(value) {
  return { stringValue: value };
}

function numberValue(value) {
  return { integerValue: String(value) };
}

function timestampNow() {
  return { timestampValue: new Date().toISOString() };
}

function arrayStrings(values) {
  return {
    arrayValue: {
      values: values.map((value) => ({ stringValue: value })),
    },
  };
}

async function main() {
  console.log("Seeding Firebase emulators with baseline SAC data...");

  const { uid, idToken } = await createEmulatorUser();

  await writeDoc(uid, idToken, "user_profile", uid, {
    id: stringValue(uid),
    email: stringValue("seed-user@tachikoma.local"),
    displayName: stringValue("Seed User"),
    chatUsername: stringValue("USER"),
    geminiModel: stringValue("gemini-3.5-flash"),
    rateLimitRPM: numberValue(15),
    createdAt: numberValue(Date.now()),
    updatedAt: timestampNow(),
  });

  await writeDoc(uid, idToken, "agent_profiles", "seed-agent-1", {
    id: stringValue("seed-agent-1"),
    name: stringValue("LOGIKOMA"),
    color: stringValue("#00d1ff"),
    hex: stringValue("#00d1ff"),
    temp: { doubleValue: 0.2 },
    system: stringValue("Seeded logical analysis agent"),
    role: stringValue("chatter"),
    model: stringValue("gemini-3.5-flash"),
    silenceProtocol: stringValue("standard"),
    createdAt: numberValue(Date.now()),
    updatedAt: timestampNow(),
  });

  await writeDoc(uid, idToken, "chat_sessions", "seed-chat-1", {
    id: stringValue("seed-chat-1"),
    title: stringValue("Seed Chat Session"),
    description: stringValue("Auto-seeded local emulator chat"),
    conversationSummary: stringValue("Seed summary"),
    messages: { arrayValue: { values: [] } },
    participatingAgents: { arrayValue: { values: [] } },
    createdAt: numberValue(Date.now()),
    updatedAt: timestampNow(),
  });

  console.log(`Seed complete for uid=${uid}`);
}

main().catch((error) => {
  console.error("Emulator seed failed:", error.message);
  process.exit(1);
});
