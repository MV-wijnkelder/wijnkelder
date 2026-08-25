import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import type { ConfigurationItem, ExcelStorageErrorCode } from "@/services/storage/excel-storage-service";

const FRIENDLY_ERRORS: Record<ExcelStorageErrorCode, { message: string; status: number }> = {
  AUTHENTICATION_FAILED: { message: "Microsoft Graph-authenticatie is mislukt. Controleer de tenant, client en app-machtigingen.", status: 502 },
  WORKBOOK_MISSING: { message: "Het geconfigureerde Excel-werkboek bestaat niet op OneDrive.", status: 503 },
  WORKBOOK_ACCESS_DENIED: { message: "Microsoft Graph heeft geen toegang tot het Excel-werkboek.", status: 503 },
  WORKSHEET_MISSING: { message: "Het werkblad van de geconfigureerde Excel-tabel bestaat niet.", status: 503 },
  TABLE_MISSING: { message: "De geconfigureerde Excel-tabel bestaat niet in het werkboek.", status: 503 },
  NETWORK_TIMEOUT: { message: "De verbinding met Microsoft Graph duurde te lang. Probeer het opnieuw.", status: 504 },
  WINE_NOT_FOUND: { message: "De bestaande wijn kon niet opnieuw worden gevonden.", status: 409 },
  STORAGE_FAILED: { message: "De Excel-opslagbewerking is mislukt. Controleer de tabelkolommen en probeer opnieuw.", status: 502 },
};

export async function POST(request: Request) { return store(request, "add"); }
export async function PATCH(request: Request) { return store(request, "increase"); }

async function store(request: Request, operation: "add" | "increase") {
  let wine: Wine;
  try { wine = await request.json() as Wine; }
  catch { return NextResponse.json({ error: "Ongeldige wijngegevens." }, { status: 400 }); }

  try {
    const { ExcelStorageService } = await import("@/services/storage/excel-storage-service");
    const storage = new ExcelStorageService();
    const result = operation === "add" ? await storage.addWine(wine) : await storage.increaseBottleCount(wine);
    return NextResponse.json(result, {
      status: operation === "add" && result.status === "WineAdded" ? 201 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const configurationItem = getConfigurationItem(error);
    if (configurationItem) {
      console.error("Excel storage configuration is missing", { configurationItem });
      return NextResponse.json(
        { error: `Ontbrekende configuratie: ${configurationItem}.` },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const code = getStorageErrorCode(error);
    console.error("Excel storage operation failed", { code, operation });
    return NextResponse.json(
      { error: FRIENDLY_ERRORS[code].message },
      { status: FRIENDLY_ERRORS[code].status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function getConfigurationItem(error: unknown): ConfigurationItem | undefined {
  if (error instanceof Error && error.name === "ExcelStorageError" && "configurationItem" in error) return error.configurationItem as ConfigurationItem | undefined;
}
function getStorageErrorCode(error: unknown): ExcelStorageErrorCode {
  if (error instanceof Error && error.name === "ExcelStorageError" && "code" in error && String(error.code) in FRIENDLY_ERRORS) return error.code as ExcelStorageErrorCode;
  return "STORAGE_FAILED";
}
