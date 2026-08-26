import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  authRuntimeDiagnostics,
  loadMicrosoftAuthConfig,
  microsoftAuthorizeUrl,
} from "@/server/auth/microsoft-config";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const diagnostics = authRuntimeDiagnostics(process.env, request.nextUrl.origin);
  console.info("[microsoft-auth] authorize request", diagnostics);

  const result = loadMicrosoftAuthConfig(process.env, request.nextUrl.origin);
  if (!result.ok) {
    // This deliberately is not a redirect: a configuration problem must remain
    // visible in both the browser network panel and the Vercel function log.
    console.error("[microsoft-auth] authorize stopped; no redirect", {
      missing: result.missing,
      configuredAuthUrl: result.configuredAuthUrl,
    });
    return NextResponse.json(
      { error: "Microsoft OAuth is not configured", missing: result.missing },
      { status: 500 },
    );
  }

  const state = randomBytes(32).toString("base64url");
  const destination = microsoftAuthorizeUrl(result.config, state);
  console.info("[microsoft-auth] redirecting to Microsoft", {
    destinationOrigin: destination.origin,
    tenantId: result.config.tenantId,
    callbackUrl: result.config.callbackUrl,
  });
  const response = NextResponse.redirect(destination, 307);
  response.cookies.set("microsoft_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });
  return response;
}
