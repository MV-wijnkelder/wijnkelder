import assert from "node:assert/strict";
import test from "node:test";
import { emptyCellarDetails, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";
import { enrichWineProfile, hasWineProfile, refreshWineProfile } from "../src/server/wine-profile-enrichment.ts";

const wine = { id: 7, producer: "Estate", wineName: "Reserve", vintage: "2020", country: "France", region: "Bordeaux", appellation: null, grapeVarieties: ["Merlot"], wineColor: "red", bottleSize: "750 ml", alcoholPercentage: 13, confidence: 90, marketValue: null, marketValueCurrency: null, profile: emptyWineProfile(), profileMetadata: emptyWineProfileMetadata(), cellar: emptyCellarDetails(), bottleCount: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
const profile = { ...emptyWineProfile(), tasting: { appearance: "Ruby", aromas: ["blackcurrant", "cedar"], flavors: ["plum"], finish: "Long and savory" }, serving: { temperature: "16–18°C", decantAdvice: "Decant for 30 minutes" }, drinking: { drinkFrom: "2024", drinkUntil: "2030", currentMaturity: "ready" }, style: { body: "medium", acidity: "medium", tannin: "medium", sweetness: "low", alcohol: "medium", wineStyle: "classic dry red" }, foodPairings: ["roast lamb"], summary: "A structured Bordeaux red." };

test("an empty profile is generated, persisted, and returned", async () => {
  let generated = 0, persisted = 0;
  const result = await enrichWineProfile(wine, { async generateWineProfile() { generated++; return { profile, marketValue: 42, marketValueCurrency: "EUR" }; } }, { async updateEnrichment(id, value) { persisted++; assert.equal(id, 7); assert.deepEqual(value.profile, profile); return { ...wine, ...value }; } });
  assert.equal(generated, 1); assert.equal(persisted, 1); assert.equal(result.profile.summary, profile.summary); assert.equal(hasWineProfile(result.profile), true);
});

test("a populated profile is never regenerated", async () => {
  const populated = { ...wine, profile };
  const result = await enrichWineProfile(populated, { async generateWineProfile() { throw new Error("must not run"); } }, { async updateEnrichment() { throw new Error("must not save"); } });
  assert.equal(result, populated);
});

test("structured sensory guidance makes a profile populated", () => {
  const sensoryOnly = emptyWineProfile();
  sensoryOnly.tasting.aromas = ["violet"];
  assert.equal(hasWineProfile(sensoryOnly), true);
});

test("a temporary enrichment failure leaves the wine usable and retryable", async () => {
  let saved = false;
  const result = await enrichWineProfile(wine, { async generateWineProfile() { throw new Error("temporary outage"); } }, { async updateEnrichment() { saved = true; return null; } });
  assert.equal(result, wine); assert.equal(saved, false); assert.equal(hasWineProfile(result.profile), false);
});

test("an empty AI response is not persisted", async () => {
  let saved = false;
  const result = await enrichWineProfile(wine, { async generateWineProfile() { return { profile: emptyWineProfile(), marketValue: null, marketValueCurrency: null }; } }, { async updateEnrichment() { saved = true; return null; } });
  assert.equal(result, wine); assert.equal(saved, false);
});

test("an explicit refresh replaces only generated profile data", async () => {
  const original = { ...wine, profile: { ...profile, summary: "Old profile" }, bottleCount: 6 };
  const result = await refreshWineProfile(original, { async generateWineProfile() { return { profile, marketValue: 42, marketValueCurrency: "EUR" }; } }, { async updateEnrichment(id, value, refreshed) {
    assert.equal(id, original.id); assert.equal(refreshed, true);
    return { ...original, ...value };
  } });
  assert.equal(result.profile.summary, profile.summary);
  assert.equal(result.producer, original.producer);
  assert.equal(result.bottleCount, 6);
});
