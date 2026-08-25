import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";

type ExcelStorageErrorCode =
  | "AUTHENTICATION_FAILED"
  | "WORKBOOK_UNAVAILABLE"
  | "TABLE_MISSING"
  | "NETWORK_TIMEOUT"
  | "NOT_CONFIGURED"
  | "STORAGE_FAILED";

const FRIENDLY_ERRORS: Record<ExcelStorageErrorCode, { message: string; status: number }> = {
  AUTHENTICATION_FAILED: { message: "De verbinding met de wijnkelder kon niet worden geverifieerd.", status: 502 },
  WORKBOOK_UNAVAILABLE: { message: "De wijnkelder is momenteel niet beschikbaar.", status: 503 },
  TABLE_MISSING: { message: "De wijntabel kon niet worden gevonden.", status: 503 },
  NETWORK_TIMEOUT: { message: "Het opslaan duurde te lang. Probeer het opnieuw.", status: 504 },
  NOT_CONFIGURED: { message: "De wijnkelder is nog niet geconfigureerd.", status: 503 },
  STORAGE_FAILED: { message: "De wijn kon niet worden opgeslagen. Probeer het opnieuw.", status: 502 },
};

export async function POST(request: Request) {
  let wine: Wine;
  try {
    wine = await request.json() as Wine;
  } catch {
    return NextResponse.json({ error: "Ongeldige wijngegevens." }, { status: 400 });
  }

  try {
    // Keep Microsoft Graph out of recognition's module graph and initialize it
    // only when this storage endpoint is explicitly called by the user.
    const { ExcelStorageService } = await import("@/services/storage/excel-storage-service");
    await new ExcelStorageService().addWine(wine);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const code = getStorageErrorCode(error);
    const friendlyError = FRIENDLY_ERRORS[code];
    console.error("Excel storage operation failed", code);
    return NextResponse.json({ error: friendlyError.message }, { status: friendlyError.status });
  }
}

function getStorageErrorCode(error: unknown): ExcelStorageErrorCode {
  if (error instanceof Error && error.name === "ExcelStorageError" && error.message in FRIENDLY_ERRORS) {
    return error.message as ExcelStorageErrorCode;
  }
  return "STORAGE_FAILED";
}
