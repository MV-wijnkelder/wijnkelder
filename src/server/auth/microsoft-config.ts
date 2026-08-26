const MICROSOFT_AUTHORIZE_URL = "https://login.microsoftonline.com";

export type MicrosoftAuthConfig = {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  callbackUrl: string;
};

export type MicrosoftAuthConfigResult =
  | { ok: true; config: MicrosoftAuthConfig }
  | { ok: false; missing: string[]; configuredAuthUrl: string | null };

type Environment = Record<string, string | undefined>;

export function loadMicrosoftAuthConfig(
  environment: Environment,
  requestOrigin: string,
): MicrosoftAuthConfigResult {
  const clientId = environment.MICROSOFT_CLIENT_ID?.trim() ?? "";
  const clientSecret = environment.MICROSOFT_CLIENT_SECRET?.trim() ?? "";
  const tenantId = environment.MICROSOFT_TENANT_ID?.trim() || "common";
  const configuredAuthUrl = (
    environment.AUTH_URL?.trim() || environment.NEXTAUTH_URL?.trim() || ""
  ).replace(/\/$/, "");
  const missing = [
    !clientId && "MICROSOFT_CLIENT_ID",
    !clientSecret && "MICROSOFT_CLIENT_SECRET",
  ].filter((name): name is string => Boolean(name));

  if (missing.length > 0) {
    return { ok: false, missing, configuredAuthUrl: configuredAuthUrl || null };
  }

  return {
    ok: true,
    config: {
      clientId,
      clientSecret,
      tenantId,
      callbackUrl: `${configuredAuthUrl || requestOrigin}/api/auth/callback/microsoft`,
    },
  };
}

export function microsoftAuthorizeUrl(config: MicrosoftAuthConfig, state: string) {
  const url = new URL(
    `/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/authorize`,
    MICROSOFT_AUTHORIZE_URL,
  );
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", config.callbackUrl);
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile offline_access User.Read Files.ReadWrite");
  url.searchParams.set("state", state);
  return url;
}

export function microsoftTokenUrl(tenantId: string) {
  return new URL(
    `/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    MICROSOFT_AUTHORIZE_URL,
  );
}

export function authRuntimeDiagnostics(environment: Environment, requestOrigin: string) {
  const authUrl = environment.AUTH_URL?.trim() || null;
  const nextAuthUrl = environment.NEXTAUTH_URL?.trim() || null;
  return {
    microsoftClientIdLoaded: Boolean(environment.MICROSOFT_CLIENT_ID?.trim()),
    microsoftClientIdLength: environment.MICROSOFT_CLIENT_ID?.trim().length ?? 0,
    microsoftClientSecretLoaded: Boolean(environment.MICROSOFT_CLIENT_SECRET?.trim()),
    microsoftClientSecretLength: environment.MICROSOFT_CLIENT_SECRET?.trim().length ?? 0,
    microsoftTenantIdLoaded: Boolean(environment.MICROSOFT_TENANT_ID?.trim()),
    authUrl,
    nextAuthUrl,
    requestOrigin,
  };
}
