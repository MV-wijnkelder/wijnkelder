import "server-only";

import type { Wine } from "@/domain/wine";
import type { AddWineResult, IncreaseWineResult, StorageService, WineLabelImages } from "@/services/storage/storage-service";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const LOGIN_ROOT = "https://login.microsoftonline.com";
const REQUEST_TIMEOUT_MS = 15_000;

export type ConfigurationItem = "MICROSOFT_TENANT_ID" | "MICROSOFT_CLIENT_ID" | "MICROSOFT_CLIENT_SECRET" | "ONEDRIVE_FILE_ID" | "EXCEL_TABLE_NAME";
export type ExcelStorageErrorCode = "AUTHENTICATION_FAILED" | "WORKBOOK_MISSING" | "WORKBOOK_ACCESS_DENIED" | "WORKSHEET_MISSING" | "TABLE_MISSING" | "NETWORK_TIMEOUT" | "STORAGE_FAILED" | "WINE_NOT_FOUND";

export class ExcelStorageError extends Error {
  constructor(readonly code: ExcelStorageErrorCode, readonly configurationItem?: ConfigurationItem) {
    super(code);
    this.name = "ExcelStorageError";
  }
}

type ExcelConfiguration = { tenantId: string; clientId: string; clientSecret: string; fileId: string; tableName: string };
type Cell = string | number | boolean | null;
type TableData = { headers: string[]; rows: Cell[][] };

const COLUMN_ALIASES = {
  producer: ["producer", "producent"], wineName: ["wine name", "winename", "wijnnaam", "wine"], vintage: ["vintage", "jaargang"],
  country: ["country", "land"], region: ["region", "regio"], appellation: ["appellation", "appellatie"],
  grapeVarieties: ["grape varieties", "grapevarieties", "druivenrassen", "grapes"], wineColor: ["wine color", "winecolor", "wijnkleur", "color", "kleur"],
  bottleSize: ["bottle size", "bottlesize", "flesformaat"], alcoholPercentage: ["alcohol percentage", "alcoholpercentage", "alcohol"],
  confidence: ["confidence", "zekerheid"], bottleQuantity: ["bottle quantity", "bottlequantity", "quantity", "aantal flessen", "aantal", "flessen"],
} as const;

/**
 * Microsoft Graph-backed cellar storage. Label images deliberately stop at this
 * boundary; a future image provider can persist them without changing Wine.
 */
export class ExcelStorageService implements StorageService {
  async addWine(wine: Wine, labelImages?: WineLabelImages): Promise<AddWineResult> {
    void labelImages;
    const context = await connect();
    const data = await readTable(context.tableUrl, context.accessToken);
    const columns = resolveColumns(data.headers);
    const duplicate = findDuplicate(data.rows, columns, wine);
    console.info("Excel duplicate detection completed", { found: duplicate !== -1 });
    if (duplicate !== -1) return { status: "WineAlreadyExists", bottleQuantity: quantity(data.rows[duplicate][columns.bottleQuantity]) };

    const row = makeRow(data.headers.length, columns, wine, 1);
    const response = await graphRequest(`${context.tableUrl}/rows/add`, context.accessToken, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] }),
    });
    if (!response.ok) throw response.status === 404 ? new ExcelStorageError("TABLE_MISSING") : new ExcelStorageError("STORAGE_FAILED");
    console.info("Excel wine row inserted");
    return { status: "WineAdded", bottleQuantity: 1 };
  }

  async increaseBottleCount(wine: Wine): Promise<IncreaseWineResult> {
    const context = await connect();
    const data = await readTable(context.tableUrl, context.accessToken);
    const columns = resolveColumns(data.headers);
    const rowIndex = findDuplicate(data.rows, columns, wine);
    console.info("Excel duplicate detection completed for quantity update", { found: rowIndex !== -1 });
    if (rowIndex === -1) throw new ExcelStorageError("WINE_NOT_FOUND");
    const nextQuantity = quantity(data.rows[rowIndex][columns.bottleQuantity]) + 1;
    const response = await graphRequest(`${context.tableUrl}/rows/itemAt(index=${rowIndex})/range`, context.accessToken, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: [data.rows[rowIndex].map((cell, index) => index === columns.bottleQuantity ? nextQuantity : cell)] }),
    });
    if (!response.ok) throw new ExcelStorageError("STORAGE_FAILED");
    console.info("Excel bottle quantity updated", { bottleQuantity: nextQuantity });
    return { status: "BottleQuantityIncreased", bottleQuantity: nextQuantity };
  }
}

async function connect() {
  const configuration = getConfiguration();
  console.info("Microsoft Graph authentication started");
  const accessToken = await authenticate(configuration);
  console.info("Microsoft Graph authentication succeeded");
  const workbookUrl = `${GRAPH_ROOT}/drive/items/${encodeURIComponent(configuration.fileId)}`;
  console.info("Microsoft Graph workbook access check started", { fileIdConfigured: true });
  const workbook = await graphRequest(workbookUrl, accessToken);
  if (workbook.status === 404) throw new ExcelStorageError("WORKBOOK_MISSING");
  if (!workbook.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");
  const tableUrl = `${workbookUrl}/workbook/tables/${encodeURIComponent(configuration.tableName)}`;
  console.info("Microsoft Graph table lookup started", { tableName: configuration.tableName });
  const table = await graphRequest(tableUrl, accessToken);
  if (table.status === 404) throw new ExcelStorageError("TABLE_MISSING");
  if (!table.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");
  const worksheet = await graphRequest(`${tableUrl}/worksheet`, accessToken);
  if (worksheet.status === 404) throw new ExcelStorageError("WORKSHEET_MISSING");
  if (!worksheet.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");
  console.info("Microsoft Graph workbook, worksheet and table access verified");
  return { accessToken, tableUrl };
}

async function readTable(tableUrl: string, token: string): Promise<TableData> {
  // The workbook is the inventory source of truth. These requests deliberately
  // bypass caches on every operation so manual Excel edits are immediately used.
  const [headerResponse, rows] = await Promise.all([
    graphRequest(`${tableUrl}/headerRowRange`, token), readAllRows(`${tableUrl}/rows`, token),
  ]);
  if (!headerResponse.ok) throw new ExcelStorageError("STORAGE_FAILED");
  const header = await headerResponse.json() as { values?: unknown };
  if (!Array.isArray(header.values) || !Array.isArray(header.values[0])) throw new ExcelStorageError("STORAGE_FAILED");
  return { headers: header.values[0].map(String), rows };
}

async function readAllRows(firstPageUrl: string, token: string): Promise<Cell[][]> {
  const rows: Cell[][] = [];
  let pageUrl: string | undefined = firstPageUrl;
  while (pageUrl) {
    const response = await graphRequest(pageUrl, token);
    if (!response.ok) throw new ExcelStorageError("STORAGE_FAILED");
    const page = await response.json() as {
      value?: Array<{ values?: unknown }>;
      "@odata.nextLink"?: string;
    };
    if (!Array.isArray(page.value)) throw new ExcelStorageError("STORAGE_FAILED");
    for (const row of page.value) {
      if (!Array.isArray(row.values) || !Array.isArray(row.values[0])) throw new ExcelStorageError("STORAGE_FAILED");
      rows.push(row.values[0] as Cell[]);
    }
    pageUrl = page["@odata.nextLink"];
  }
  return rows;
}

function resolveColumns(headers: string[]) {
  const normalized = headers.map(normalize);
  const entries = Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [key, normalized.findIndex((header) => aliases.includes(header as never))]);
  if (entries.some(([, index]) => index === -1)) throw new ExcelStorageError("STORAGE_FAILED");
  return Object.fromEntries(entries) as Record<keyof typeof COLUMN_ALIASES, number>;
}

function findDuplicate(rows: Cell[][], columns: ReturnType<typeof resolveColumns>, wine: Wine) {
  return rows.findIndex((row) => normalize(row[columns.producer]) === normalize(wine.producer) && normalize(row[columns.wineName]) === normalize(wine.wineName) && normalize(row[columns.vintage]) === normalize(wine.vintage));
}

function makeRow(length: number, columns: ReturnType<typeof resolveColumns>, wine: Wine, bottles: number): Cell[] {
  const row: Cell[] = Array(length).fill("");
  const values = { ...wine, grapeVarieties: wine.grapeVarieties.join(", "), bottleQuantity: bottles };
  for (const key of Object.keys(COLUMN_ALIASES) as Array<keyof typeof COLUMN_ALIASES>) row[columns[key]] = values[key] ?? "";
  return row;
}

function normalize(value: unknown) { return String(value ?? "").trim().toLocaleLowerCase("nl-NL"); }
function quantity(value: unknown) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0; }

function getConfiguration(): ExcelConfiguration {
  const definitions: Array<[ConfigurationItem, keyof ExcelConfiguration]> = [
    ["MICROSOFT_TENANT_ID", "tenantId"], ["MICROSOFT_CLIENT_ID", "clientId"], ["MICROSOFT_CLIENT_SECRET", "clientSecret"],
    ["ONEDRIVE_FILE_ID", "fileId"], ["EXCEL_TABLE_NAME", "tableName"],
  ];
  const configuration: Partial<ExcelConfiguration> = {};
  for (const [environmentName, key] of definitions) {
    const value = process.env[environmentName]?.trim();
    if (!value) throw new ExcelStorageError("STORAGE_FAILED", environmentName);
    configuration[key] = value;
  }
  return configuration as ExcelConfiguration;
}

async function authenticate(configuration: ExcelConfiguration): Promise<string> {
  const response = await timedFetch(`${LOGIN_ROOT}/${encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: configuration.clientId, client_secret: configuration.clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  if (!response.ok) throw new ExcelStorageError("AUTHENTICATION_FAILED");
  const payload: unknown = await response.json();
  if (!isTokenResponse(payload)) throw new ExcelStorageError("AUTHENTICATION_FAILED");
  return payload.access_token;
}

function graphRequest(url: string, token: string, init: RequestInit = {}) {
  return timedFetch(url, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", ...init.headers },
  });
}
async function timedFetch(url: string, init: RequestInit) {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); }
  catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new ExcelStorageError("NETWORK_TIMEOUT");
    throw new ExcelStorageError("STORAGE_FAILED");
  }
}
function isTokenResponse(value: unknown): value is { access_token: string } { return typeof value === "object" && value !== null && "access_token" in value && typeof value.access_token === "string"; }
