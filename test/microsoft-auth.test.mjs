import assert from "node:assert/strict";
import test from "node:test";
import {
  accountFromIdToken,
  beginOAuth,
  seal,
  unseal,
  validTransaction,
} from "../src/server/auth/microsoft-auth.ts";

process.env.AUTH_SESSION_SECRET = "a-test-secret-that-is-at-least-32-characters-long";

test("creates a PKCE transaction and validates its state", () => {
  const { transaction, challenge } = beginOAuth();
  assert.match(transaction.verifier, /^[A-Za-z0-9_-]+$/);
  assert.match(challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(validTransaction(transaction, transaction.state), true);
  assert.equal(validTransaction(transaction, `${transaction.state}x`), false);
});

test("encrypts delegated session data and rejects tampering", () => {
  const session = { account: "person@outlook.com", refreshToken: "refresh-secret", createdAt: Date.now() };
  const encrypted = seal(session);
  assert.equal(encrypted.includes(session.account), false);
  assert.deepEqual(unseal(encrypted), session);
  assert.equal(unseal(`${encrypted.slice(0, -1)}x`), null);
});

test("reads the account only from an ID token with the expected nonce", () => {
  const payload = Buffer.from(JSON.stringify({ nonce: "expected", preferred_username: "person@hotmail.com" })).toString("base64url");
  const idToken = `header.${payload}.signature`;
  assert.equal(accountFromIdToken(idToken, "expected"), "person@hotmail.com");
  assert.equal(accountFromIdToken(idToken, "different"), null);
});
