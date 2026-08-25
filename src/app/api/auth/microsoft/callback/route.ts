import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_SCOPES, MICROSOFT_AUTHORITY, OAUTH_COOKIE, accountFromIdToken, authCookieOptions, microsoftConfiguration, oauthCookieOptions, seal, unseal, validTransaction } from "@/server/auth/microsoft-auth";

export const runtime = "nodejs";

type OAuthTransaction = { state: string; nonce: string; verifier: string; createdAt: number };

export async function GET(request: NextRequest) {
  const appUrl = new URL("/scan", request.url);
  const cookieStore = await cookies();
  const transaction = unseal<OAuthTransaction>(cookieStore.get(OAUTH_COOKIE)?.value);
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error") || !validTransaction(transaction, request.nextUrl.searchParams.get("state"))) {
    return redirectWithError(appUrl, "invalid_oauth_response");
  }

  const configuration = microsoftConfiguration();
  const body = new URLSearchParams({
    client_id: configuration.clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: configuration.redirectUri,
    code_verifier: transaction.verifier,
    scope: AUTH_SCOPES,
  });
  if (configuration.clientSecret) body.set("client_secret", configuration.clientSecret);

  const tokenResponse = await fetch(`${MICROSOFT_AUTHORITY}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const token = await tokenResponse.json() as { id_token?: unknown; refresh_token?: unknown };
  const account = typeof token.id_token === "string" ? accountFromIdToken(token.id_token, transaction.nonce) : null;
  if (!tokenResponse.ok || !account || typeof token.refresh_token !== "string") return redirectWithError(appUrl, "token_exchange_failed");

  const response = NextResponse.redirect(appUrl);
  response.cookies.set(AUTH_COOKIE, seal({ account, refreshToken: token.refresh_token, createdAt: Date.now() }), authCookieOptions);
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });
  return response;
}

function redirectWithError(url: URL, error: string) {
  url.searchParams.set("auth_error", error);
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, "", { ...oauthCookieOptions, maxAge: 0 });
  return response;
}
