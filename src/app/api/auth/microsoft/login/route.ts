import { NextResponse } from "next/server";
import { AUTH_SCOPES, MICROSOFT_AUTHORITY, OAUTH_COOKIE, beginOAuth, microsoftConfiguration, oauthCookieOptions, seal } from "@/server/auth/microsoft-auth";

export const runtime = "nodejs";

export function GET() {
  const configuration = microsoftConfiguration();
  const { transaction, challenge } = beginOAuth();
  const authorizationUrl = new URL(`${MICROSOFT_AUTHORITY}/authorize`);
  authorizationUrl.search = new URLSearchParams({
    client_id: configuration.clientId,
    response_type: "code",
    redirect_uri: configuration.redirectUri,
    response_mode: "query",
    scope: AUTH_SCOPES,
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OAUTH_COOKIE, seal(transaction), oauthCookieOptions);
  return response;
}
