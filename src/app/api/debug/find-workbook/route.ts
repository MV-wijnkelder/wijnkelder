import { NextResponse } from "next/server.js";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";
const LOGIN_ROOT = "https://login.microsoftonline.com";
const WORKBOOK_NAME = "Wijnkelder_MCHRDV.xlsx";
const REQUEST_TIMEOUT_MS = 15_000;

type DriveItem = {
  id?: unknown;
  name?: unknown;
  parentReference?: { path?: unknown };
  size?: unknown;
};

class MicrosoftGraphError extends Error {
  readonly graphUrl: string;
  readonly graphStatus: number;
  readonly graphCode: string;

  constructor(
    graphUrl: string,
    graphStatus: number,
    graphCode: string,
    graphMessage: string,
  ) {
    super(graphMessage);
    this.name = "MicrosoftGraphError";
    this.graphUrl = graphUrl;
    this.graphStatus = graphStatus;
    this.graphCode = graphCode;
  }
}

export async function GET() {
  console.info("OneDrive workbook diagnostic started", { workbookName: WORKBOOK_NAME });

  try {
    const accessToken = await authenticate();
    const workbook = await findWorkbook(accessToken);

    if (!workbook) {
      console.info("OneDrive workbook diagnostic completed", { found: false });
      return NextResponse.json({ found: false }, { headers: { "Cache-Control": "no-store" } });
    }

    console.info("OneDrive workbook diagnostic completed", { found: true, id: workbook.id });
    return NextResponse.json({
      found: true,
      name: workbook.name,
      id: workbook.id,
      parentPath: typeof workbook.parentReference?.path === "string" ? workbook.parentReference.path : "",
      size: typeof workbook.size === "number" ? workbook.size : 0,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof MicrosoftGraphError) {
      console.error("OneDrive workbook diagnostic Graph request failed", {
        graphUrl: error.graphUrl,
        graphStatus: error.graphStatus,
        graphCode: error.graphCode,
        graphMessage: error.message,
      });
      return NextResponse.json({
        tokenObtained: true,
        graphUrl: error.graphUrl,
        graphStatus: error.graphStatus,
        graphCode: error.graphCode,
        graphMessage: error.message,
      }, { status: error.graphStatus, headers: { "Cache-Control": "no-store" } });
    }

    console.error("OneDrive workbook diagnostic failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "The OneDrive workbook search failed." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

async function authenticate(): Promise<string> {
  const tenantId = requiredConfiguration("MICROSOFT_TENANT_ID");
  const clientId = requiredConfiguration("MICROSOFT_CLIENT_ID");
  const clientSecret = requiredConfiguration("MICROSOFT_CLIENT_SECRET");
  const response = await fetch(`${LOGIN_ROOT}/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Microsoft authentication returned ${response.status}`);

  const payload = await response.json() as { access_token?: unknown };
  if (typeof payload.access_token !== "string" || !payload.access_token) throw new Error("Microsoft authentication returned no access token");
  return payload.access_token;
}

async function findWorkbook(accessToken: string): Promise<Required<Pick<DriveItem, "id" | "name">> & DriveItem | undefined> {
  const searchUrl = new URL(`${GRAPH_ROOT}/drive/root/search(q='${encodeURIComponent(WORKBOOK_NAME)}')`);
  searchUrl.searchParams.set("$select", "id,name,parentReference,size");
  let pageUrl: string | undefined = searchUrl.toString();

  while (pageUrl) {
    const response = await fetch(pageUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const graphError = await readGraphError(response);
      throw new MicrosoftGraphError(pageUrl, response.status, graphError.code, graphError.message);
    }

    const page = await response.json() as { value?: DriveItem[]; "@odata.nextLink"?: unknown };
    if (!Array.isArray(page.value)) throw new Error("Microsoft Graph search returned an invalid response");
    const workbook = page.value.find((item): item is Required<Pick<DriveItem, "id" | "name">> & DriveItem =>
      item.name === WORKBOOK_NAME && typeof item.id === "string" && Boolean(item.id));
    if (workbook) return workbook;
    pageUrl = typeof page["@odata.nextLink"] === "string" ? page["@odata.nextLink"] : undefined;
  }
}

async function readGraphError(response: Response): Promise<{ code: string; message: string }> {
  const fallbackMessage = `Microsoft Graph search returned ${response.status}`;

  try {
    const payload = await response.json() as { error?: { code?: unknown; message?: unknown } };
    return {
      code: typeof payload.error?.code === "string" ? payload.error.code : "",
      message: typeof payload.error?.message === "string" ? payload.error.message : fallbackMessage,
    };
  } catch {
    return { code: "", message: fallbackMessage };
  }
}

function requiredConfiguration(name: "MICROSOFT_TENANT_ID" | "MICROSOFT_CLIENT_ID" | "MICROSOFT_CLIENT_SECRET"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}
