import "server-only";

import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
} from "node:crypto";

export const MICROSOFT_AUTH_COOKIE = "microsoft_auth";
export const OAUTH_STATE_COOKIE = "microsoft_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "microsoft_oauth_verifier";
export const OAUTH_NONCE_COOKIE = "microsoft_oauth_nonce";

export const oauthCookieOptions = {
  httpOnly: true,
  maxAge: 10 * 60,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

const CONSUMER_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad";
const CONSUMERS_BASE_URL = "https://login.microsoftonline.com/consumers/oauth2/v2.0";
const EXPECTED_ISSUER = `https://login.microsoftonline.com/${CONSUMER_TENANT_ID}/v2.0`;
const JWKS_URL = "https://login.microsoftonline.com/consumers/discovery/v2.0/keys";

type JwtHeader = { alg?: string; kid?: string };
type JwtPayload = {
  aud?: string;
  email?: string;
  exp?: number;
  iss?: string;
  nonce?: string;
  preferred_username?: string;
  tid?: string;
};

type MicrosoftJwk = JsonWebKey & { kid?: string };

function requiredEnvironment(name: "MICROSOFT_CLIENT_ID" | "MICROSOFT_CLIENT_SECRET" | "AUTH_SECRET") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function decodePart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

export function createOAuthRequest() {
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(64));
  const nonce = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());

  return { challenge, nonce, state, verifier };
}

export function createAuthorizationUrl(origin: string, request: ReturnType<typeof createOAuthRequest>) {
  const url = new URL(`${CONSUMERS_BASE_URL}/authorize`);
  url.searchParams.set("client_id", requiredEnvironment("MICROSOFT_CLIENT_ID"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", `${origin}/api/auth/microsoft/callback`);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", request.state);
  url.searchParams.set("nonce", request.nonce);
  url.searchParams.set("code_challenge", request.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

export async function exchangeAuthorizationCode(code: string, verifier: string, origin: string) {
  const response = await fetch(`${CONSUMERS_BASE_URL}/token`, {
    body: new URLSearchParams({
      client_id: requiredEnvironment("MICROSOFT_CLIENT_ID"),
      client_secret: requiredEnvironment("MICROSOFT_CLIENT_SECRET"),
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: `${origin}/api/auth/microsoft/callback`,
      scope: "openid email profile",
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Microsoft rejected the authorization code.");
  }

  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) {
    throw new Error("Microsoft did not return an ID token.");
  }

  return tokens.id_token;
}

async function getSigningKey(kid: string) {
  const response = await fetch(JWKS_URL, { next: { revalidate: 60 * 60 } });
  if (!response.ok) {
    throw new Error("Microsoft signing keys could not be loaded.");
  }

  const { keys } = (await response.json()) as { keys: MicrosoftJwk[] };
  const key = keys.find((candidate) => candidate.kid === kid);
  if (!key) {
    throw new Error("The Microsoft signing key was not found.");
  }

  return createPublicKey({ format: "jwk", key });
}

export async function verifyMicrosoftIdToken(token: string, expectedNonce: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("The Microsoft ID token is malformed.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart<JwtHeader>(encodedHeader);
  const payload = decodePart<JwtPayload>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("The Microsoft ID token uses an unsupported signature.");
  }

  const key = await getSigningKey(header.kid);
  const signatureIsValid = verify(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    key,
    Buffer.from(encodedSignature, "base64url"),
  );
  const clientId = requiredEnvironment("MICROSOFT_CLIENT_ID");
  const now = Math.floor(Date.now() / 1000);

  if (
    !signatureIsValid ||
    payload.aud !== clientId ||
    payload.iss !== EXPECTED_ISSUER ||
    payload.tid !== CONSUMER_TENANT_ID ||
    payload.nonce !== expectedNonce ||
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    throw new Error("The Microsoft ID token could not be verified.");
  }

  const email = payload.email ?? payload.preferred_username;
  if (!email) {
    throw new Error("Microsoft did not provide an email address.");
  }

  return email;
}

export function createAuthCookie(email: string) {
  const encodedEmail = base64url(email);
  const signature = createHmac("sha256", requiredEnvironment("AUTH_SECRET"))
    .update(encodedEmail)
    .digest("base64url");
  return `${encodedEmail}.${signature}`;
}

export function readAuthCookie(value?: string) {
  if (!value) return null;

  const [encodedEmail, receivedSignature] = value.split(".");
  if (!encodedEmail || !receivedSignature) return null;

  const expectedSignature = createHmac("sha256", requiredEnvironment("AUTH_SECRET"))
    .update(encodedEmail)
    .digest();
  const signature = Buffer.from(receivedSignature, "base64url");

  if (signature.length !== expectedSignature.length || !timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  return Buffer.from(encodedEmail, "base64url").toString("utf8");
}
