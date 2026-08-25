import "server-only";

import type { Wine } from "@/domain/wine";
import type { StorageService } from "@/services/storage/storage-service";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const LOGIN_ROOT = "https://login.microsoftonline.com";
const REQUEST_TIMEOUT_MS = 15_000;

export type ExcelStorageErrorCode =
  | "AUTHENTICATION_FAILED"
  | "WORKBOOK_UNAVAILABLE"
  | "TABLE_MISSING"
  | "NETWORK_TIMEOUT"
  | "NOT_CONFIGURED"
  | "STORAGE_FAILED";

export class ExcelStorageError extends Error {
  constructor(readonly code: ExcelStorageErrorCode) {
    super(code);
    this.name = "ExcelStorageError";
  }
}

type ExcelConfiguration = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  fileId: string;
  tableName: string;
};

/** Server-side Microsoft Graph implementation of the storage contract. */
export class ExcelStorageService implements StorageService {
  async addWine(wine: Wine): Promise<boolean> {
    const configuration = getConfiguration();
    const accessToken = await authenticate(configuration);
    const workbookUrl = `${GRAPH_ROOT}/drive/items/${encodeURIComponent(configuration.fileId)}`;
    const tableUrl = `${workbookUrl}/workbook/tables/${encodeURIComponent(configuration.tableName)}`;

    const tableResponse = await graphRequest(tableUrl, accessToken);
    if (tableResponse.status === 404) {
      const workbookResponse = await graphRequest(workbookUrl, accessToken);
      if (workbookResponse.status === 404) throw new ExcelStorageError("WORKBOOK_UNAVAILABLE");
      if (!workbookResponse.ok) throw new ExcelStorageError("WORKBOOK_UNAVAILABLE");
      throw new ExcelStorageError("TABLE_MISSING");
    }
    if (!tableResponse.ok) throw new ExcelStorageError("WORKBOOK_UNAVAILABLE");

    const addRowResponse = await graphRequest(`${tableUrl}/rows/add`, accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [wineToExcelRow(wine)] }),
    });

    if (addRowResponse.status === 404) throw new ExcelStorageError("TABLE_MISSING");
    if (!addRowResponse.ok) throw new ExcelStorageError("STORAGE_FAILED");

    const addedRow: unknown = await addRowResponse.json();
    if (!isConfirmedTableRow(addedRow)) throw new ExcelStorageError("STORAGE_FAILED");
    return true;
  }
}

/** Column order mirrors every field in the canonical Wine model. */
function wineToExcelRow(wine: Wine): Array<string | number> {
  return [
    wine.producer ?? "",
    wine.wineName ?? "",
    wine.vintage ?? "",
    wine.country ?? "",
    wine.region ?? "",
    wine.appellation ?? "",
    wine.grapeVarieties.join(", "),
    wine.wineColor ?? "",
    wine.bottleSize ?? "",
    wine.alcoholPercentage ?? "",
    wine.confidence,
  ];
}

function getConfiguration(): ExcelConfiguration {
  const values = {
    tenantId: process.env.MICROSOFT_TENANT_ID,
    clientId: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    fileId: process.env.ONEDRIVE_FILE_ID,
    tableName: process.env.EXCEL_TABLE_NAME,
  };
  if (Object.values(values).some((value) => !value)) throw new ExcelStorageError("NOT_CONFIGURED");
  return values as ExcelConfiguration;
}

async function authenticate(configuration: ExcelConfiguration): Promise<string> {
  const response = await timedFetch(`${LOGIN_ROOT}/${encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new ExcelStorageError("AUTHENTICATION_FAILED");

  const payload: unknown = await response.json();
  if (!isTokenResponse(payload)) throw new ExcelStorageError("AUTHENTICATION_FAILED");
  return payload.access_token;
}

function graphRequest(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  return timedFetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new ExcelStorageError("NETWORK_TIMEOUT");
    }
    throw new ExcelStorageError("STORAGE_FAILED");
  }
}

function isTokenResponse(value: unknown): value is { access_token: string } {
  return typeof value === "object" && value !== null && "access_token" in value
    && typeof value.access_token === "string";
}

function isConfirmedTableRow(value: unknown): boolean {
  return typeof value === "object" && value !== null && "values" in value && Array.isArray(value.values);
}
