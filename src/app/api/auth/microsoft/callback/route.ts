import { NextRequest, NextResponse } from "next/server";
import {
  createAuthCookie,
  exchangeAuthorizationCode,
  MICROSOFT_AUTH_COOKIE,
  oauthCookieOptions,
  OAUTH_NONCE_COOKIE,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  verifyMicrosoftIdToken,
} from "@/lib/microsoft-auth";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(OAUTH_VERIFIER_COOKIE)?.value;
  const nonce = request.cookies.get(OAUTH_NONCE_COOKIE)?.value;

  try {
    if (!code || !state || !storedState || state !== storedState || !verifier || !nonce) {
      throw new Error("The OAuth response is invalid.");
    }

    const idToken = await exchangeAuthorizationCode(code, verifier, request.nextUrl.origin);
    const email = await verifyMicrosoftIdToken(idToken, nonce);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(MICROSOFT_AUTH_COOKIE, createAuthCookie(email), {
      ...oauthCookieOptions,
      maxAge: 8 * 60 * 60,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    response.cookies.delete(OAUTH_VERIFIER_COOKIE);
    response.cookies.delete(OAUTH_NONCE_COOKIE);
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?authError=signin", request.url));
  }
}
