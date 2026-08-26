import assert from "node:assert/strict";
import test from "node:test";
import {
  authRuntimeDiagnostics,
  loadMicrosoftAuthConfig,
  microsoftAuthorizeUrl,
  microsoftTokenUrl,
} from "../src/server/auth/microsoft-config.ts";

test("reports missing Microsoft secrets instead of creating a redirect", () => {
  assert.deepEqual(loadMicrosoftAuthConfig({}, "https://preview.example"), {
    ok: false,
    missing: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    configuredAuthUrl: null,
  });
});

test("uses AUTH_URL for the registered callback and builds the Microsoft URL", () => {
  const result = loadMicrosoftAuthConfig({
    MICROSOFT_CLIENT_ID: " client-id ",
    MICROSOFT_CLIENT_SECRET: " secret ",
    MICROSOFT_TENANT_ID: "tenant-id",
    AUTH_URL: "https://wine.example/",
    NEXTAUTH_URL: "https://ignored.example",
  }, "https://preview.example");
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.config.callbackUrl, "https://wine.example/api/auth/callback/microsoft");
  const url = microsoftAuthorizeUrl(result.config, "csrf-state");
  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(url.searchParams.get("client_id"), "client-id");
  assert.equal(url.searchParams.get("redirect_uri"), result.config.callbackUrl);
  assert.equal(url.searchParams.get("state"), "csrf-state");
  assert.equal(
    microsoftTokenUrl(result.config.tenantId).toString(),
    "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
  );
});

test("diagnostics prove values were loaded without exposing either value", () => {
  assert.deepEqual(authRuntimeDiagnostics({
    MICROSOFT_CLIENT_ID: "abc",
    MICROSOFT_CLIENT_SECRET: "super-secret",
    NEXTAUTH_URL: "https://wine.example",
  }, "https://request.example"), {
    microsoftClientIdLoaded: true,
    microsoftClientIdLength: 3,
    microsoftClientSecretLoaded: true,
    microsoftClientSecretLength: 12,
    microsoftTenantIdLoaded: false,
    authUrl: null,
    nextAuthUrl: "https://wine.example",
    requestOrigin: "https://request.example",
  });
});
