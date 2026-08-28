import assert from "node:assert/strict";
import test from "node:test";
import { emptyCellarDetails, emptyMarketValueMetadata, emptyWineProfile, emptyWineProfileMetadata } from "../src/domain/wine.ts";
import { determineMarketValue } from "../src/server/market-value/market-value-provider.ts";
import { refreshMarketValue } from "../src/server/market-value/market-value-service.ts";

const wine = {
  id: 12, producer: "Château Example", wineName: "Grand Vin", vintage: "2019",
  bottleSize: "750 ml", appellation: "Margaux", region: "Bordeaux", country: "France",
  grapeVarieties: [], wineColor: "red", alcoholPercentage: null, confidence: 90,
  marketValue: null, marketValueCurrency: null, marketValueMetadata: emptyMarketValueMetadata(),
  profile: emptyWineProfile(), profileMetadata: emptyWineProfileMetadata(), cellar: emptyCellarDetails(),
  bottleCount: 3, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
};

test("reliable public offers become one deterministic EUR market value", async () => {
  const quote = await determineMarketValue(wine, { name: "test", async findPrices(candidate) {
    assert.equal(candidate.producer, "Château Example");
    assert.equal(candidate.vintage, "2019");
    assert.equal(candidate.bottleSize, "750 ml");
    return [
      { price: 30, currency: "EUR", sourceUrl: "https://merchant.example/wine" },
      { price: 24, currency: "EUR", sourceUrl: "https://winery.example/2019" },
      { price: 120, currency: "EUR", sourceUrl: "http://unsafe.example/listing" },
    ];
  } });
  assert.deepEqual(quote, { value: 27, currency: "EUR", sourceUrls: ["https://winery.example/2019", "https://merchant.example/wine"] });
});

test("no reliable public offer remains unavailable rather than falling back to purchase price", async () => {
  const quote = await determineMarketValue({ ...wine, cellar: { ...wine.cellar, purchasePrice: 99 } }, { name: "test", async findPrices() { return []; } });
  assert.deepEqual(quote, { value: null, currency: null, sourceUrls: [] });
});

test("refresh changes only cached market value fields", async () => {
  const saved = await refreshMarketValue(wine, { name: "public-test", async findPrices() { return [{ price: 44.5, currency: "EUR", sourceUrl: "https://retailer.example/exact-wine" }]; } }, {
    async updateMarketValue(id, value, currency, metadata) {
      assert.equal(id, wine.id);
      return { ...wine, marketValue: value, marketValueCurrency: currency, marketValueMetadata: metadata };
    },
  });
  assert.equal(saved.marketValue, 44.5);
  assert.equal(saved.profile, wine.profile);
  assert.equal(saved.cellar, wine.cellar);
  assert.equal(saved.bottleCount, 3);
  assert.equal(saved.marketValueMetadata.provider, "public-test");
});
