import { NextRequest, NextResponse } from "next/server";
import {
  createAuthorizationUrl,
  createOAuthRequest,
  oauthCookieOptions,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
} from "@/lib/microsoft-auth";

export function GET(request: NextRequest) {
  try {
    const oauthRequest = createOAuthRequest();
    const response = NextResponse.redirect(createAuthorizationUrl(request.nextUrl.origin, oauthRequest));

    response.cookies.set(OAUTH_STATE_COOKIE, oauthRequest.state, oauthCookieOptions);
    response.cookies.set(OAUTH_VERIFIER_COOKIE, oauthRequest.verifier, oauthCookieOptions);
    response.cookies.set(OAUTH_NONCE_COOKIE, oauthRequest.nonce, oauthCookieOptions);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?authError=configuration", request.url));
  }
}
