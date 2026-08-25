import type { Wine } from "@/domain/wine";
import type { AddWineResult, IncreaseWineResult, StorageService, WineLabelImages } from "@/services/storage/storage-service";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const LOGIN_ROOT = "https://login.microsoftonline.com";
const REQUEST_TIMEOUT_MS = 15_000;
const RETRYABLE_STATUSES = new Set([409, 423, 429, 503, 504]);
const MAX_WRITE_ATTEMPTS = 4;

export type ExcelStorageErrorCode = "AUTHENTICATION_FAILED" | "WORKBOOK_MISSING" | "WORKBOOK_ACCESS_DENIED" | "WORKSHEET_MISSING" | "TABLE_MISSING" | "NETWORK_TIMEOUT" | "WORKBOOK_LOCKED" | "STORAGE_FAILED" | "WINE_NOT_FOUND";

export class ExcelStorageError extends Error {
  readonly code: ExcelStorageErrorCode;
  readonly missingConfiguration?: string;

  constructor(code: ExcelStorageErrorCode, missingConfiguration?: string) {
    super(missingConfiguration ? `Missing configuration: ${missingConfiguration}` : code);
    this.name = "ExcelStorageError";
    this.code = code;
    this.missingConfiguration = missingConfiguration;
  }
}

type ExcelConfiguration = { tenantId: string; clientId: string; clientSecret: string; fileId: string; tableName: string };
type Cell = string | number | boolean | null;
type TableData = { headers: string[]; rows: Cell[][] };
type WorkbookContext = { accessToken: string; tableUrl: string; sessionId: string };

console.info("Microsoft configuration", {
  "MICROSOFT_TENANT_ID exists": Boolean(process.env.MICROSOFT_TENANT_ID?.trim()),
  "MICROSOFT_CLIENT_ID exists": Boolean(process.env.MICROSOFT_CLIENT_ID?.trim()),
  "MICROSOFT_CLIENT_SECRET exists": Boolean(process.env.MICROSOFT_CLIENT_SECRET?.trim()),
  "ONEDRIVE_FILE_ID exists": Boolean(process.env.ONEDRIVE_FILE_ID?.trim()),
  "EXCEL_TABLE_NAME exists": Boolean(process.env.EXCEL_TABLE_NAME?.trim()),
});

const COLUMN_ALIASES = {
  producer: ["producer", "producent"], wineName: ["wine name", "winename", "wijnnaam", "wine"], vintage: ["vintage", "jaargang"],
  country: ["country", "land"], region: ["region", "regio"], appellation: ["appellation", "appellatie"],
  grapeVarieties: ["grape varieties", "grapevarieties", "druivenrassen", "grapes"], wineColor: ["wine color", "winecolor", "wijnkleur", "color", "kleur"],
  bottleSize: ["bottle size", "bottlesize", "flesformaat"], alcoholPercentage: ["alcohol percentage", "alcoholpercentage", "alcohol"],
  confidence: ["confidence", "zekerheid"], bottleQuantity: ["bottle quantity", "bottlequantity", "quantity", "aantal flessen", "aantal", "flessen"],
} as const;

/**
 * A short-lived queue prevents two requests handled by this process from
 * performing a read/modify/write cycle simultaneously. It stores no cellar
 * data; Excel is re-read inside every queued operation and remains the source
 * of truth. Graph conflict handling below also covers other app instances.
 */
let workbookOperation = Promise.resolve();
function serialise<T>(operation: () => Promise<T>): Promise<T> {
  const result = workbookOperation.then(operation, operation);
  workbookOperation = result.then(() => undefined, () => undefined);
  return result;
}

export class ExcelStorageService implements StorageService {
  addWine(wine: Wine, labelImages?: WineLabelImages): Promise<AddWineResult> {
    void labelImages;
    return serialise(() => withWorkbookSession(async (context) => {
      const data = await readTable(context);
      const columns = resolveColumns(data.headers);
      const duplicate = findDuplicate(data.rows, columns, wine);
      if (duplicate !== -1) return { status: "WineAlreadyExists", bottleQuantity: quantity(data.rows[duplicate][columns.bottleQuantity]) };

      const row = makeRow(data.headers.length, columns, wine, 1);
      const response = await writeRequest(`${context.tableUrl}/rows/add`, context, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: [row] }),
      });
      if (!response.ok) throw response.status === 404 ? new ExcelStorageError("TABLE_MISSING") : storageWriteError(response.status);
      return { status: "WineAdded", bottleQuantity: 1 };
    }));
  }

  increaseBottleCount(wine: Wine): Promise<IncreaseWineResult> {
    return serialise(() => withWorkbookSession(async (context) => {
      // Re-read here rather than trusting the quantity returned by addWine.
      const data = await readTable(context);
      const columns = resolveColumns(data.headers);
      const rowIndex = findDuplicate(data.rows, columns, wine);
      if (rowIndex === -1) throw new ExcelStorageError("WINE_NOT_FOUND");
      const nextQuantity = quantity(data.rows[rowIndex][columns.bottleQuantity]) + 1;
      const values: null[][] = [Array(data.headers.length).fill(null)];
      (values[0] as Array<Cell>)[columns.bottleQuantity] = nextQuantity;
      const response = await writeRequest(`${context.tableUrl}/rows/itemAt(index=${rowIndex})/range`, context, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }),
      });
      if (!response.ok) throw storageWriteError(response.status);
      return { status: "BottleQuantityIncreased", bottleQuantity: nextQuantity };
    }));
  }
}

async function withWorkbookSession<T>(operation: (context: WorkbookContext) => Promise<T>): Promise<T> {
  const configuration = getConfiguration();
  const accessToken = await authenticate(configuration);
  const workbookUrl = `${GRAPH_ROOT}/drive/items/${encodeURIComponent(configuration.fileId)}`;
  const workbook = await graphRequest(workbookUrl, accessToken);
  if (workbook.status === 404) throw new ExcelStorageError("WORKBOOK_MISSING");
  if (!workbook.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");
  const tableUrl = `${workbookUrl}/workbook/tables/${encodeURIComponent(configuration.tableName)}`;
  const table = await graphRequest(tableUrl, accessToken);
  if (table.status === 404) throw new ExcelStorageError("TABLE_MISSING");
  if (!table.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");
  const worksheet = await graphRequest(`${tableUrl}/worksheet`, accessToken);
  if (worksheet.status === 404) throw new ExcelStorageError("WORKSHEET_MISSING");
  if (!worksheet.ok) throw new ExcelStorageError("WORKBOOK_ACCESS_DENIED");

  const sessionResponse = await writeRequest(`${workbookUrl}/workbook/createSession`, { accessToken, sessionId: "" }, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persistChanges: true }),
  }, false);
  if (!sessionResponse.ok) throw storageWriteError(sessionResponse.status);
  const session = await sessionResponse.json() as { id?: unknown };
  if (typeof session.id !== "string" || !session.id) throw new ExcelStorageError("STORAGE_FAILED");
  const context = { accessToken, tableUrl, sessionId: session.id };
  try { return await operation(context); }
  finally {
    // Closing commits a persistent session. A failed close is logged because the
    // mutation may already have succeeded and must not be repeated blindly.
    const close = await graphRequest(`${workbookUrl}/workbook/closeSession`, accessToken, { method: "POST" }, session.id).catch(() => null);
    if (close && !close.ok) console.error("Microsoft Graph workbook session could not be closed", { status: close.status });
  }
}

async function readTable(context: WorkbookContext): Promise<TableData> {
  const [headerResponse, rows] = await Promise.all([
    graphRequest(`${context.tableUrl}/headerRowRange`, context.accessToken, {}, context.sessionId), readAllRows(`${context.tableUrl}/rows`, context),
  ]);
  if (!headerResponse.ok) throw new ExcelStorageError("STORAGE_FAILED");
  const header = await headerResponse.json() as { values?: unknown };
  if (!Array.isArray(header.values) || !Array.isArray(header.values[0])) throw new ExcelStorageError("STORAGE_FAILED");
  return { headers: header.values[0].map(String), rows };
}

async function readAllRows(firstPageUrl: string, context: WorkbookContext): Promise<Cell[][]> {
  const rows: Cell[][] = [];
  let pageUrl: string | undefined = firstPageUrl;
  while (pageUrl) {
    const response = await graphRequest(pageUrl, context.accessToken, {}, context.sessionId);
    if (!response.ok) throw new ExcelStorageError("STORAGE_FAILED");
    const page = await response.json() as { value?: Array<{ values?: unknown }>; "@odata.nextLink"?: string };
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
  return {
    tenantId: requiredConfiguration("MICROSOFT_TENANT_ID", process.env.MICROSOFT_TENANT_ID),
    clientId: requiredConfiguration("MICROSOFT_CLIENT_ID", process.env.MICROSOFT_CLIENT_ID),
    clientSecret: requiredConfiguration("MICROSOFT_CLIENT_SECRET", process.env.MICROSOFT_CLIENT_SECRET),
    fileId: requiredConfiguration("ONEDRIVE_FILE_ID", process.env.ONEDRIVE_FILE_ID),
    tableName: requiredConfiguration("EXCEL_TABLE_NAME", process.env.EXCEL_TABLE_NAME),
  };
}
function requiredConfiguration(name: string, value: string | undefined): string {
  const configuredValue = value?.trim();
  if (!configuredValue) throw new ExcelStorageError("STORAGE_FAILED", name);
  return configuredValue;
}
async function authenticate(configuration: ExcelConfiguration): Promise<string> {
  const response = await timedFetch(`${LOGIN_ROOT}/${encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: configuration.clientId, client_secret: configuration.clientSecret, scope: "https://graph.microsoft.com/.default", grant_type: "client_credentials" }),
  });
  if (!response.ok) throw new ExcelStorageError("AUTHENTICATION_FAILED");
  const payload: unknown = await response.json();
  if (typeof payload !== "object" || payload === null || !("access_token" in payload) || typeof payload.access_token !== "string") throw new ExcelStorageError("AUTHENTICATION_FAILED");
  return payload.access_token;
}
function graphRequest(url: string, token: string, init: RequestInit = {}, sessionId?: string) {
  return timedFetch(url, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache", ...(sessionId ? { "workbook-session-id": sessionId } : {}), ...init.headers } });
}
async function writeRequest(url: string, context: Pick<WorkbookContext, "accessToken" | "sessionId">, init: RequestInit, includeSession = true) {
  let response: Response | undefined;
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    response = await graphRequest(url, context.accessToken, init, includeSession ? context.sessionId : undefined);
    if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_WRITE_ATTEMPTS - 1) return response;
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader === null ? Number.NaN : Number(retryAfterHeader);
    await delay(Number.isFinite(retryAfter) && retryAfter >= 0 ? retryAfter * 1_000 : 100 * 2 ** attempt);
  }
  return response!;
}
function storageWriteError(status: number) { return new ExcelStorageError(status === 409 || status === 423 ? "WORKBOOK_LOCKED" : "STORAGE_FAILED"); }
function delay(milliseconds: number) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
async function timedFetch(url: string, init: RequestInit) {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }); }
  catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new ExcelStorageError("NETWORK_TIMEOUT");
    throw new ExcelStorageError("STORAGE_FAILED");
  }
}
