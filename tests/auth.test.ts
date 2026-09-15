import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync } from "node:crypto";
import { adminServices } from "../src/lib/firebase-admin";
import { requireAdmin } from "../src/lib/require-admin";
import { ApiError, body, handle } from "../src/lib/api-server";
import { shopSchema } from "../src/lib/validations";
import type { DecodedIdToken } from "firebase-admin/auth";

test("missing bearer token is rejected before reading credentials", async () => {
  await assert.rejects(requireAdmin(new Request("http://localhost/api/shops")), (error: unknown) => error instanceof ApiError && error.status === 401);
});
test("invalid, revoked and non-admin tokens are rejected; admin token checks revocation", async (context) => {
  const original = { project: process.env.FIREBASE_PROJECT_ID, email: process.env.FIREBASE_CLIENT_EMAIL, key: process.env.FIREBASE_PRIVATE_KEY, uid: process.env.ADMIN_UID };
  process.env.FIREBASE_PROJECT_ID = "demo-routebook";
  process.env.FIREBASE_CLIENT_EMAIL = "test@demo-routebook.iam.gserviceaccount.com";
  process.env.FIREBASE_PRIVATE_KEY = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  process.env.ADMIN_UID = "only-admin";
  try {
    const { auth } = adminServices();
    const verify = context.mock.method(auth, "verifyIdToken", async () => { throw new Error("invalid"); });
    const request = new Request("http://localhost/api/shops", { headers: { authorization: "Bearer test-token" } });
    await assert.rejects(requireAdmin(request), (error: unknown) => error instanceof ApiError && error.status === 401);
    verify.mock.mockImplementation(async () => ({ uid: "another-user" } as DecodedIdToken));
    await assert.rejects(requireAdmin(request), (error: unknown) => error instanceof ApiError && error.status === 403);
    verify.mock.mockImplementation(async () => ({ uid: "only-admin" } as DecodedIdToken));
    assert.equal(await requireAdmin(request), "only-admin");
    assert.deepEqual(verify.mock.calls[2].arguments, ["test-token", true]);
  } finally {
    for (const [name, value] of Object.entries({ FIREBASE_PROJECT_ID: original.project, FIREBASE_CLIENT_EMAIL: original.email, FIREBASE_PRIVATE_KEY: original.key, ADMIN_UID: original.uid })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
test("API error responses redact unexpected errors and reject malformed bodies", async () => {
  const response = await handle(async () => { throw new Error("secret-test-value"); });
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("secret-test-value"), false);
  const request = new Request("http://localhost/api/shops", { method: "POST", body: "{" });
  await assert.rejects(body(request, shopSchema), (error: unknown) => error instanceof ApiError && error.status === 400);
});
