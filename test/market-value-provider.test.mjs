import assert from "node:assert/strict";
import test from "node:test";
import { emptyCellarDetails, emptyMarketValueMetadata, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";
import { determineMarketValue } from "../src/server/market-value/market-value-provider.ts";
import { isMarketValueFresh, refreshMarketValue, selectMarketValueBatch, shouldAutomaticallyValue } from "../src/server/market-value/market-value-service.ts";

const wine = { id: 12, producer: "Château Example", wineName: "Grand Vin", vintage: "2019", bottleSize: "750 ml", appellation: "Margaux", region: "Bordeaux", country: "France", grapeVarieties: [], wineColor: "Red", alcoholPercentage: null, confidence: 90, marketValue: null, marketValueCurrency: null, marketValueMetadata: emptyMarketValueMetadata(), profile: emptyWineProfile(), profileMetadata: emptyWineProfileMetadata(), cellar: emptyCellarDetails(), bottleCount: 3, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const observation = (price, merchant, extra = {}) => ({ price, currency: "EUR", sourceUrl: `https://${merchant}.example/exact-wine`, merchant, producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage, bottleSize: wine.bottleSize, packageQuantity: 1, offerType: "retail", available: true, exactMatch: true, evidenceQuality: "high", ...extra });
const quote = (items) => determineMarketValue(wine, { name: "test", async findPrices() { return items; } });

test("credible independent offers use a deterministic outlier-resistant median", async () => {
  const result = await quote([observation(18, "one"), observation(20, "two"), observation(21, "three"), observation(149, "four")]);
  assert.equal(result.value, 20); assert.equal(result.observationCount, 3); assert.equal(result.confidence, "high");
});
test("foreign and unsupported currencies are rejected instead of relabelled EUR", async () => {
  assert.equal((await quote([observation(150, "za", { currency: "ZAR" })])).value, null);
  assert.equal((await quote([observation(30, "unknown", { currency: "ABC" })])).value, null);
});
test("wrong identity, bottle sizes and case prices are rejected", async () => {
  for (const change of [{ producer: "Other Estate" }, { wineName: "Second Wine" }, { bottleSize: "1500 ml" }, { packageQuantity: 6 }]) assert.equal((await quote([observation(30, "bad", change)])).value, null);
});
test("duplicate merchant evidence does not increase confidence", async () => {
  const result = await quote([observation(20, "same"), observation(22, "same", { sourceUrl: "https://same.example/another" })]);
  assert.equal(result.observationCount, 1); assert.equal(result.confidence, "low");
});
test("one exact high-quality offer is low confidence; one weak offer is unavailable", async () => {
  assert.deepEqual((await quote([observation(24, "one")])).confidence, "low");
  assert.equal((await quote([observation(24, "weak", { evidenceQuality: "low" })])).value, null);
});
test("no evidence remains null and never falls back to purchase price", async () => { assert.equal((await quote([])).value, null); });
test("refresh persists provenance without changing inventory", async () => {
  const saved = await refreshMarketValue(wine, { name: "public-test", async findPrices() { return [observation(44.5, "retailer")]; } }, { async updateMarketValue(id, value, currency, metadata) { return { ...wine, marketValue: value, marketValueCurrency: currency, marketValueMetadata: metadata }; } });
  assert.equal(saved.marketValue, 44.5); assert.equal(saved.bottleCount, 3); assert.equal(saved.marketValueMetadata.observationCount, 1);
});
test("freshness and bounded batches skip current and completed wines while failures remain retryable", () => {
  const now = new Date("2026-09-17T00:00:00Z");
  const fresh = { ...wine, id: 1, marketValue: 20, marketValueMetadata: { ...emptyMarketValueMetadata(), retrievedAt: "2026-09-01T00:00:00Z" } };
  const stale = Array.from({ length: 5 }, (_, index) => ({ ...wine, id: index + 2, marketValue: 20, marketValueMetadata: { ...emptyMarketValueMetadata(), retrievedAt: "2026-07-01T00:00:00Z" } }));
  assert.equal(isMarketValueFresh(fresh, now), true); assert.equal(shouldAutomaticallyValue(fresh, now), false);
  assert.deepEqual(selectMarketValueBatch([fresh, ...stale], [], now).map(({ id }) => id), [2, 3, 4]);
  assert.deepEqual(selectMarketValueBatch([fresh, ...stale], [2, 3, 4], now).map(({ id }) => id), [5, 6]);
  assert.deepEqual(selectMarketValueBatch([fresh, ...stale], [2, 4], now).map(({ id }) => id), [3, 5, 6]);
});
