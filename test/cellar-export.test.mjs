import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CELLAR_EXPORT_HEADERS, cellarExportRows, createCellarWorkbook, exportFilename } from "../src/lib/cellar-export.ts";
import { emptyCellarDetails, emptyMarketValueMetadata, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";

function wine(overrides = {}) {
  const profile = emptyWineProfile();
  profile.drinking = { drinkFrom: "2024", peakFrom: "2026", peakUntil: "2028", drinkUntil: "2030", currentMaturity: null };
  return { id: 1, producer: "Renato Ratti", wineName: "Marcenasco", vintage: "2020", country: "Italy", region: "Piedmont", appellation: "Barolo", grapeVarieties: ["Nebbiolo"], wineColor: "Red", bottleSize: "750 ml", alcoholPercentage: 14.5, confidence: 100, marketValue: 50, marketValueCurrency: "EUR", marketValueMetadata: emptyMarketValueMetadata(), profile, profileMetadata: emptyWineProfileMetadata(), cellar: { ...emptyCellarDetails(), tastingNotes: "Cellar note" }, bottleCount: 6, createdAt: "2026-01-01", updatedAt: "2026-01-01", ...overrides };
}

test("export maps one canonical wine to one row with numeric quantity and market totals", () => {
  const [row] = cellarExportRows([wine()], 2026);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Quantity")], 6);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Estimated Market Value per Bottle")], 50);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Total Estimated Market Value")], 300);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Drink Readiness")], "Peak Drinking");
});

test("unknown market value remains empty rather than becoming zero", () => {
  const [row] = cellarExportRows([wine({ marketValue: null })], 2026);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Estimated Market Value per Bottle")], null);
  assert.equal(row[CELLAR_EXPORT_HEADERS.indexOf("Total Estimated Market Value")], null);
});

test("generated workbook is a valid filtered XLSX zip with the expected filename", () => {
  const workbook = createCellarWorkbook([wine()]);
  const directory = mkdtempSync(join(tmpdir(), "vinocastello-export-"));
  const path = join(directory, "cellar.xlsx");
  writeFileSync(path, workbook);
  const entries = execFileSync("unzip", ["-Z1", path], { encoding: "utf8" });
  assert.match(entries, /xl\/worksheets\/sheet1.xml/);
  assert.equal(exportFilename(new Date("2026-09-02T12:00:00Z")), "VinoCastello_Cellar_2026-09-02.xlsx");
});
