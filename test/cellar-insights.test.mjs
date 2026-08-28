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
    bottleSize: null, alcoholPercentage: null, confidence: 1, profile,
    profileMetadata: emptyWineProfileMetadata(),
    cellar: { ...emptyCellarDetails(), purchasePrice: overrides.price ?? null, purchaseCurrency: overrides.currency ?? null },
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };
}

test("readiness rises towards peak and falls after it", () => {
  const subject = wine({ drinking: { drinkFrom: "2026", drinkUntil: "2030", currentMaturity: null } });
  assert.equal(getReadinessStars(subject, 2023), 2);
  assert.equal(getReadinessStars(subject, 2028), 5);
  assert.equal(getReadinessStars(subject, 2033), 2);
});

test("insights derive collection, horizon, mix and same-currency value from canonical wines", () => {
  const report = buildCellarInsights([
    wine({ id: 1, bottleCount: 3, drinking: { drinkFrom: "2028", drinkUntil: "2032", currentMaturity: null }, price: 25, currency: "EUR" }),
    wine({ id: 2, bottleCount: 1, producer: "Second Estate", country: "France", region: "Bordeaux", wineColor: "White", grapes: ["Sémillon"], vintage: "2018", drinking: { drinkFrom: "2027", drinkUntil: "2029", currentMaturity: null }, price: 40, currency: "EUR" }),
    wine({ id: 3, bottleCount: 1, price: 100, currency: "USD" }),
  ], 2026);
  assert.deepEqual({ bottles: report.bottles, wines: report.wines, countries: report.countries, regions: report.regions }, { bottles: 5, wines: 3, countries: 2, regions: 2 });
  assert.deepEqual(report.horizon, [{ year: 2027, wines: 1 }, { year: 2028, wines: 1 }]);
  assert.equal(report.value?.currency, "EUR");
  assert.equal(report.value?.total, 115);
  assert.equal(report.highlights.oldest, "2018");
  assert.ok(report.health >= 0 && report.health <= 100);
});
