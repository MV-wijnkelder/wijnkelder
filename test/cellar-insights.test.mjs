import assert from "node:assert/strict";
import test from "node:test";
import { buildCellarInsights, getReadinessStars } from "../src/lib/cellar-insights.ts";
import { emptyCellarDetails, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";

function wine(overrides = {}) {
  const profile = emptyWineProfile();
  profile.drinking = overrides.drinking ?? profile.drinking;
  return {
    id: overrides.id ?? 1, bottleCount: overrides.bottleCount ?? 1,
    producer: overrides.producer ?? "Estate", wineName: "Cuvée", vintage: overrides.vintage ?? "2020",
    country: overrides.country ?? "Italy", region: overrides.region ?? "Tuscany",
    appellation: null, grapeVarieties: overrides.grapes ?? ["Sangiovese"], wineColor: overrides.wineColor ?? "Red",
    bottleSize: null, alcoholPercentage: null, confidence: 1, marketValue: overrides.marketValue ?? null, marketValueCurrency: overrides.marketValueCurrency ?? null, profile,
    profileMetadata: emptyWineProfileMetadata(),
    cellar: emptyCellarDetails(),
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };
}

test("readiness rises towards peak and falls after it", () => {
  const subject = wine({ drinking: { drinkFrom: "2026", drinkUntil: "2030", currentMaturity: null } });
  assert.equal(getReadinessStars(subject, 2023), 2);
  assert.equal(getReadinessStars(subject, 2028), 5);
  assert.equal(getReadinessStars(subject, 2033), 2);
});

test("insights derive collection, horizon, mix and market value and coverage from canonical wines", () => {
  const report = buildCellarInsights([
    wine({ id: 1, bottleCount: 3, drinking: { drinkFrom: "2028", drinkUntil: "2032", currentMaturity: null }, marketValue: 25, marketValueCurrency: "EUR" }),
    wine({ id: 2, bottleCount: 1, producer: "Second Estate", country: "France", region: "Bordeaux", wineColor: "White", grapes: ["Sémillon"], vintage: "2018", drinking: { drinkFrom: "2027", drinkUntil: "2029", currentMaturity: null }, marketValue: 40, marketValueCurrency: "EUR" }),
    wine({ id: 3, bottleCount: 1, marketValue: null }),
  ], 2026);
  assert.deepEqual({ bottles: report.bottles, wines: report.wines, countries: report.countries, regions: report.regions }, { bottles: 5, wines: 3, countries: 2, regions: 2 });
  assert.deepEqual(report.horizon, [{ year: 2027, wines: 1 }, { year: 2028, wines: 1 }]);
  assert.equal(report.value.currency, "EUR");
  assert.equal(report.value.total, 115);
  assert.deepEqual({ valued: report.value.valuedBottles, unvalued: report.value.unvaluedBottles, coverage: report.value.coveragePercentage }, { valued: 4, unvalued: 1, coverage: 80 });
  assert.equal(report.highlights.oldest, "2018");
  assert.ok(report.health >= 0 && report.health <= 100);
});


test("market totals update dynamically with quantity and exclude unavailable values", () => {
  const initial = buildCellarInsights([wine({ bottleCount: 2, marketValue: 78.5, marketValueCurrency: "EUR" }), wine({ id: 2, bottleCount: 3 })]);
  const changed = buildCellarInsights([wine({ bottleCount: 6, marketValue: 78.5, marketValueCurrency: "EUR" }), wine({ id: 2, bottleCount: 3 })]);
  assert.equal(initial.value.total, 157);
  assert.equal(changed.value.total, 471);
  assert.deepEqual({ valued: changed.value.valuedBottles, total: changed.value.totalBottles, unvalued: changed.value.unvaluedBottles }, { valued: 6, total: 9, unvalued: 3 });
});
