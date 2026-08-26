import { NextRequest, NextResponse } from "next/server";
import {
  loadMicrosoftAuthConfig,
  microsoftTokenUrl,
} from "@/server/auth/microsoft-config";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expectedState = request.cookies.get("microsoft_oauth_state")?.value;
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  console.info("[microsoft-auth] callback received", {
    hasExpectedState: Boolean(expectedState),
    stateMatches: Boolean(expectedState && state === expectedState),
    hasCode: Boolean(code),
    oauthError,
  });

  const destination = new URL("/", request.nextUrl.origin);
  if (oauthError) destination.searchParams.set("microsoft", "denied");
  else if (!expectedState || state !== expectedState || !code) {
    destination.searchParams.set("microsoft", "invalid_callback");
  } else {
    const result = loadMicrosoftAuthConfig(process.env, request.nextUrl.origin);
    if (!result.ok) {
      console.error("[microsoft-auth] callback stopped before token exchange", {
        missing: result.missing,
      });
      return NextResponse.json(
        { error: "Microsoft OAuth is not configured", missing: result.missing },
        { status: 500 },
      );
    }

    const tokenUrl = microsoftTokenUrl(result.config.tenantId);
    console.info("[microsoft-auth] exchanging authorization code", {
      tokenEndpointOrigin: tokenUrl.origin,
      callbackUrl: result.config.callbackUrl,
    });
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: result.config.clientId,
        client_secret: result.config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: result.config.callbackUrl,
      }),
      cache: "no-store",
    });
    console.info("[microsoft-auth] token exchange completed", {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
    });
    destination.searchParams.set(
      "microsoft",
      tokenResponse.ok ? "authorized" : "token_exchange_failed",
    );
  }

  console.info("[microsoft-auth] callback redirect", {
    destination: destination.toString(),
  });
  const response = NextResponse.redirect(destination, 307);
  response.cookies.delete("microsoft_oauth_state");
  return response;
}
