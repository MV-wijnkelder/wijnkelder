import type { StoredWine } from "../domain/wine.ts";
import { getDrinkingLifecycle, drinkingOutlookLabel, drinkingStageLabel } from "./drinking-lifecycle.ts";
import { getWineType } from "./wine-normalization.ts";

export const CELLAR_EXPORT_HEADERS = [
  "Producer", "Wine Name", "Vintage", "Country", "Region", "Appellation",
  "Grape / Blend", "Colour", "Wine Type", "Bottle Size", "Alcohol %",
  "Quantity", "Drink From", "Peak From", "Peak Until", "Drink By",
  "Drink Readiness", "Drinking Outlook", "Estimated Market Value per Bottle",
  "Total Estimated Market Value", "Notes",
] as const;

export type CellarExportValue = string | number | null;

/** Maps the canonical wine record to the single row used by every cellar export. */
export function cellarExportRows(wines: StoredWine[], currentYear = new Date().getUTCFullYear()): CellarExportValue[][] {
  return wines.map((wine) => {
    const lifecycle = getDrinkingLifecycle(wine, currentYear);
    const value = wine.marketValue;
    return [
      wine.producer, wine.wineName, wine.vintage, wine.country, wine.region,
      wine.appellation, wine.grapeVarieties.join(", ") || null, wine.wineColor,
      getWineType(wine), wine.bottleSize, wine.alcoholPercentage, wine.bottleCount,
      wine.profile.drinking.drinkFrom, wine.profile.drinking.peakFrom,
      wine.profile.drinking.peakUntil, wine.profile.drinking.drinkUntil,
      lifecycle ? drinkingStageLabel(lifecycle.stage) : null,
      lifecycle ? drinkingOutlookLabel(lifecycle.outlook) : null,
      value, value === null ? null : value * wine.bottleCount,
      wine.cellar.tastingNotes,
    ];
  });
}

export function exportFilename(date = new Date()): string {
  return `VinoCastello_Cellar_${date.toISOString().slice(0, 10)}.xlsx`;
}

/** Creates a standards-based, macro-free XLSX workbook without storing a generated file. */
export function createCellarWorkbook(wines: StoredWine[]): Uint8Array {
  const rows = [CELLAR_EXPORT_HEADERS as readonly CellarExportValue[], ...cellarExportRows(wines)];
  const widths = CELLAR_EXPORT_HEADERS.map((header, column) => Math.min(42, Math.max(header.length + 2, ...rows.slice(1).map((row) => String(row[column] ?? "").length + 2))));
  const sheetRows = rows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, column) => cell(value, columnName(column), rowIndex + 1, rowIndex === 0)).join("")}</row>`).join("");
  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Cellar" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${columnName(CELLAR_EXPORT_HEADERS.length - 1)}${rows.length}"/></worksheet>`,
  };
  return zip(files);
}

export function downloadCellarWorkbook(wines: StoredWine[]) {
  const blob = new Blob([createCellarWorkbook(wines) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = exportFilename(); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function cell(value: CellarExportValue, column: string, row: number, header: boolean): string {
  if (value === null || value === "") return `<c r="${column}${row}"${header ? ' s="1"' : ""}/>`;
  if (typeof value === "number") return `<c r="${column}${row}" t="n"${header ? ' s="1"' : ""}><v>${value}</v></c>`;
  return `<c r="${column}${row}" t="inlineStr"${header ? ' s="1"' : ""}><is><t>${xml(value)}</t></is></c>`;
}
function columnName(index: number) { let name = ""; for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name; return name; }
function xml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;"); }

function zip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder(); const local: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const [name, contents] of Object.entries(files)) {
    const filename = encoder.encode(name); const data = encoder.encode(contents); const checksum = crc32(data);
    const localHeader = concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(filename.length), u16(0));
    local.push(localHeader, filename, data);
    const centralHeader = concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(checksum), u32(data.length), u32(data.length), u16(filename.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset));
    central.push(centralHeader, filename); offset += localHeader.length + filename.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const count = Object.keys(files).length;
  return concat(...local, ...central, u32(0x06054b50), u16(0), u16(0), u16(count), u16(count), u32(centralSize), u32(offset), u16(0));
}
function u16(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255); }
function u32(value: number) { return Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255); }
function concat(...parts: Uint8Array[]): Uint8Array { const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0)); let offset = 0; parts.forEach((part) => { result.set(part, offset); offset += part.length; }); return result; }
function crc32(data: Uint8Array) { let crc = -1; for (const value of data) { crc ^= value; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
