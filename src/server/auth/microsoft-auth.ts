import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const MICROSOFT_AUTHORITY = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
export const AUTH_COOKIE = "microsoft_auth";
export const OAUTH_COOKIE = "microsoft_oauth";
export const AUTH_SCOPES = "openid profile email offline_access";

const OAUTH_COOKIE_MAX_AGE = 10 * 60;
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

type OAuthTransaction = { state: string; nonce: string; verifier: string; createdAt: number };
export type MicrosoftSession = { account: string; refreshToken: string; createdAt: number };

export function microsoftConfiguration() {
  return {
    clientId: required("MICROSOFT_CLIENT_ID"),
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET?.trim(),
    redirectUri: required("MICROSOFT_REDIRECT_URI"),
  };
}

export function beginOAuth(): { transaction: OAuthTransaction; challenge: string } {
  const verifier = randomBytes(64).toString("base64url");
  return {
    transaction: {
      state: randomBytes(32).toString("base64url"),
      nonce: randomBytes(32).toString("base64url"),
      verifier,
      createdAt: Date.now(),
    },
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export function seal(value: object): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const [iv, tag, ciphertext, extra] = value.split(".");
    if (!iv || !tag || !ciphertext || extra) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function validTransaction(transaction: OAuthTransaction | null, state: string | null): transaction is OAuthTransaction {
  if (!transaction || !state || Date.now() - transaction.createdAt > OAUTH_COOKIE_MAX_AGE * 1_000) return false;
  const expected = Buffer.from(transaction.state);
  const received = Buffer.from(state);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function accountFromIdToken(idToken: string, expectedNonce: string): string | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    if (claims.nonce !== expectedNonce) return null;
    const account = claims.email ?? claims.preferred_username;
    return typeof account === "string" && account.includes("@") ? account : null;
  } catch {
    return null;
  }
}

export const oauthCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: OAUTH_COOKIE_MAX_AGE };
export const authCookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: AUTH_COOKIE_MAX_AGE };

function encryptionKey(): Buffer {
  const secret = required("AUTH_SESSION_SECRET");
  if (secret.length < 32) throw new Error("AUTH_SESSION_SECRET must be at least 32 characters");
  return createHash("sha256").update(secret).digest();
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
