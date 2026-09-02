import assert from "node:assert/strict";
import test from "node:test";
import { filterCellar } from "../src/lib/cellar-filter.ts";
import { emptyCellarDetails, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";

function wine(id, overrides = {}) {
  const profile = emptyWineProfile();
  profile.drinking = overrides.drinking ?? profile.drinking;
  profile.style.wineStyle = overrides.style ?? null;
  return { id, bottleCount: 1, producer: "Estate", wineName: overrides.name ?? "Cuvée", vintage: "2020", country: overrides.country ?? "France", region: overrides.region ?? "Bordeaux", appellation: overrides.appellation ?? null, grapeVarieties: overrides.grapes ?? ["Cabernet Sauvignon"], wineColor: overrides.colour ?? "Red", bottleSize: null, alcoholPercentage: null, confidence: 1, marketValue: null, marketValueCurrency: null, profile, profileMetadata: emptyWineProfileMetadata(), cellar: emptyCellarDetails(), createdAt: "2026-01-01", updatedAt: "2026-01-01" };
}

test("central cellar filters match canonical colour, origin, and every grape in a blend", () => {
  const wines = [wine(1, { colour: "Rosè", grapes: ["Cabernet Sauvignon", "Merlot"] }), wine(2, { region: "Champagne", colour: "White" })];
  assert.deepEqual(filterCellar(wines, { kind: "colour", value: "Rosé" }).map(({ id }) => id), [1]);
  assert.deepEqual(filterCellar(wines, { kind: "region", value: "bordeaux" }).map(({ id }) => id), [1]);
  assert.deepEqual(filterCellar(wines, { kind: "grape", value: "Merlot" }).map(({ id }) => id), [1]);
  assert.deepEqual(filterCellar(wines, { kind: "type", value: "Sparkling" }).map(({ id }) => id), [2]);
});

test("readiness and outlook filters reuse the shared lifecycle decisions", () => {
  const wines = [wine(1, { drinking: { drinkFrom: "2018", drinkUntil: "2025", currentMaturity: null } }), wine(2, { drinking: { drinkFrom: "2024", drinkUntil: "2028", currentMaturity: null } })];
  assert.deepEqual(filterCellar(wines, { kind: "readiness", value: "3" }, 2026).map(({ id }) => id), [1]);
  assert.deepEqual(filterCellar(wines, { kind: "outlook", value: "drinkNow" }, 2026).map(({ id }) => id), [2]);
});
