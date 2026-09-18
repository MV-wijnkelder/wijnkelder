import assert from "node:assert/strict";
import test from "node:test";
import { emptyCellarDetails, emptyMarketValueMetadata, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";
import { classifyObservation, determineMarketValue } from "../src/server/market-value/market-value-provider.ts";
import { isMarketValueFresh, refreshMarketValue, refreshMarketValueWithOutcome, selectMarketValueBatch, shouldAutomaticallyValue } from "../src/server/market-value/market-value-service.ts";
import { MarketValueProviderError } from "../src/server/market-value/openai-market-value-provider.ts";

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
  assert.equal(result.observationCount, 1); assert.equal(result.confidence, "medium");
});
test("one exact high-quality offer is medium confidence; one weak offer is unavailable", async () => {
  assert.deepEqual((await quote([observation(24, "one")])).confidence, "medium");
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


function existingWine(overrides = {}) {
  return { ...wine, marketValue: 25, marketValueCurrency: "EUR", marketValueMetadata: { ...emptyMarketValueMetadata(), provider: "historic", retrievedAt: "2026-07-01T00:00:00Z", sourceUrls: ["https://old.example/wine"], observationCount: 2, confidence: "medium" }, ...overrides };
}
function memoryStorage(original) {
  let current = original;
  return { async updateMarketValue(id, value, currency, metadata) { current = { ...current, id, marketValue: value, marketValueCurrency: currency, marketValueMetadata: metadata }; return current; }, current: () => current };
}

test("Aaldering-class evidence keeps currency safety and supports exact or nearby EUR vintages", async () => {
  const aaldering = { ...wine, producer: "Aaldering", wineName: "Florence", vintage: "2023" };
  const offer = (price, merchant, extra = {}) => observation(price, merchant, { producer: "Aaldering", wineName: "Florence", vintage: "2023", ...extra });
  const provider = (items) => ({ name: "test", async findPrices() { return items; } });
  assert.equal((await determineMarketValue(aaldering, provider([offer(150, "local", { currency: "ZAR" })]))).value, null);
  assert.equal((await determineMarketValue(aaldering, provider([offer(24, "eu")]))).value, 24);
  const nearby = await determineMarketValue(aaldering, provider([offer(22, "eu-one", { vintage: "2022", exactMatch: false }), offer(24, "eu-two", { vintage: "2024", exactMatch: false })]));
  assert.equal(nearby.value, 23); assert.equal(nearby.evidenceTier, "nearby"); assert.equal(nearby.confidence, "medium");
  assert.equal((await determineMarketValue(aaldering, provider([offer(30, "wrong", { wineName: "Lady M", vintage: "2023" })]))).value, null);
});

test("Nina-class identity tolerates formatting and appellation text but rejects a sibling cuvee", async () => {
  const nina = { ...wine, producer: "Poggio Ai Laghi", wineName: "Nina", vintage: "2022", appellation: "Chianti Classico Riserva DOCG" };
  const provider = (items) => ({ name: "test", async findPrices() { return items; } });
  const ninaOffer = observation(23, "italy", { producer: "  PÓGGIO ai LAGHI ", wineName: "Nina — Chianti Classico Riserva DOCG", vintage: "2022" });
  assert.equal((await determineMarketValue(nina, provider([ninaOffer]))).value, 23);
  assert.equal((await determineMarketValue(nina, provider([ninaOffer, { ...ninaOffer, price: 25, vintage: "2021", sourceUrl: "https://second.example/nina", merchant: "second", exactMatch: false }]))).value, 23, "exact evidence has priority");
  assert.equal((await determineMarketValue(nina, provider([{ ...ninaOffer, wineName: "Mia", merchant: "wrong", sourceUrl: "https://wrong.example/mia" }]))).value, null);
});

test("diagnostics safely classify rejection reasons", () => {
  assert.deepEqual(classifyObservation(wine, observation(20, "x", { currency: "USD" })), { accepted: false, reason: "wrong_currency" });
  assert.deepEqual(classifyObservation(wine, observation(20, "x", { packageQuantity: null })), { accepted: false, reason: "package_uncertain" });
  assert.deepEqual(classifyObservation(wine, observation(20, "x", { sourceUrl: "not-a-url" })), { accepted: false, reason: "invalid_url" });
  assert.deepEqual(classifyObservation(wine, observation(20, "x", { vintage: "2015" })), { accepted: false, reason: "vintage_mismatch" });
});

test("unknown-vintage exact-wine evidence is a low-confidence fallback", async () => {
  const result = await quote([observation(26, "novintage", { vintage: null, exactMatch: false })]);
  assert.equal(result.value, 26); assert.equal(result.evidenceTier, "unknown"); assert.equal(result.confidence, "low");
});

test("generic producer pages and ambiguous packages stay rejected", async () => {
  assert.equal((await quote([observation(20, "generic", { wineName: "Château Example", sourceUrl: "https://generic.example/producer" })])).value, null);
  assert.equal((await quote([observation(120, "case", { packageQuantity: 6 })])).value, null);
});

test("good revaluation replaces an existing value deterministically", async () => {
  const current = existingWine(); const storage = memoryStorage(current);
  const result = await refreshMarketValueWithOutcome(current, { name: "test", async findPrices() { return [observation(23, "a"), observation(24, "b"), observation(25, "c")]; } }, storage);
  assert.equal(result.outcome, "updated"); assert.equal(result.wine.marketValue, 24);
});

test("no accepted evidence preserves value, provenance and successful timestamp", async () => {
  const current = existingWine(); const storage = memoryStorage(current);
  const result = await refreshMarketValueWithOutcome(current, { name: "test", async findPrices() { return []; } }, storage);
  assert.equal(result.outcome, "retained"); assert.equal(result.wine.marketValue, 25); assert.equal(result.wine.marketValueMetadata.retrievedAt, "2026-07-01T00:00:00Z"); assert.equal(result.wine.marketValueMetadata.provider, "historic"); assert.equal(result.wine.marketValueMetadata.lastAttemptFailure, "insufficient_evidence");
});

test("no evidence remains unavailable only when no prior value exists", async () => {
  const storage = memoryStorage(wine); const result = await refreshMarketValueWithOutcome(wine, { name: "test", async findPrices() { return []; } }, storage);
  assert.equal(result.outcome, "unavailable"); assert.equal(result.wine.marketValue, null);
});

test("timeout and provider errors preserve an existing valuation", async () => {
  for (const kind of ["timeout", "provider"]) {
    const current = existingWine(); const storage = memoryStorage(current);
    const provider = kind === "timeout" ? { name: "test", async findPrices(_wine, { signal }) { await new Promise((resolve, reject) => { const timer = setTimeout(resolve, 50); signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }); }); return []; } } : { name: "test", async findPrices() { throw new MarketValueProviderError("provider", "failed"); } };
    await assert.rejects(() => refreshMarketValueWithOutcome(current, provider, storage, 2));
    assert.equal(storage.current().marketValue, 25); assert.equal(storage.current().marketValueMetadata.retrievedAt, "2026-07-01T00:00:00Z"); assert.equal(storage.current().marketValueMetadata.lastAttemptFailure, kind);
  }
});

test("failed batch-style refresh retains one wine while successful items remain committed", async () => {
  const first = existingWine({ id: 1 }); const second = existingWine({ id: 2 }); const firstStore = memoryStorage(first); const secondStore = memoryStorage(second);
  await refreshMarketValueWithOutcome(first, { name: "test", async findPrices() { return [observation(23, "a")]; } }, firstStore);
  await assert.rejects(() => refreshMarketValueWithOutcome(second, { name: "test", async findPrices() { throw new Error("provider"); } }, secondStore));
  assert.equal(firstStore.current().marketValue, 23); assert.equal(secondStore.current().marketValue, 25);
});

test("failed-attempt cooldown is separate from successful valuation freshness", () => {
  const now = new Date("2026-09-18T12:00:00Z");
  const staleRetained = existingWine({ marketValueMetadata: { ...existingWine().marketValueMetadata, retrievedAt: "2026-07-01T00:00:00Z", lastAttemptedAt: "2026-09-18T06:00:00Z", lastAttemptFailure: "provider" } });
  assert.equal(isMarketValueFresh(staleRetained, now), false); assert.equal(shouldAutomaticallyValue(staleRetained, now), false);
});
