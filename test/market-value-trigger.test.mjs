import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("ordinary reads, edits, and quantity changes cannot trigger market research", async () => {
  const [wineRoute, home, cellar, insights, recommendations] = await Promise.all([
    readSource("../src/app/api/wines/[id]/route.ts"),
    readSource("../src/app/page.tsx"),
    readSource("../src/app/cellar/page.tsx"),
    readSource("../src/app/cellar/insights/page.tsx"),
    readSource("../src/app/api/recommendations/route.ts"),
  ]);

  for (const source of [wineRoute, home, cellar, insights, recommendations]) {
    assert.doesNotMatch(source, /populateMarketValue|marketValueProvider|refreshMarketValue/);
  }
});

test("new-wine creation values once while duplicate quantity additions return first", async () => {
  const collectionRoute = await readSource("../src/app/api/wines/route.ts");
  const duplicateGuard = collectionRoute.indexOf("if (result.duplicate)");
  const valuation = collectionRoute.indexOf("refreshMarketValueWithOutcome(enriched");
  assert.ok(duplicateGuard > 0 && valuation > duplicateGuard);
  assert.equal(collectionRoute.match(/refreshMarketValueWithOutcome\(enriched/g)?.length, 1);
});

test("web-backed valuation is limited to new-wine creation and explicit single-wine refresh", async () => {
  const [singleRefresh, collectionRoute, wineService, cellarUi] = await Promise.all([
    readSource("../src/app/api/wines/[id]/market-value/route.ts"),
    readSource("../src/app/api/wines/route.ts"),
    readSource("../src/services/wine-service.ts"),
    readSource("../src/app/cellar/page.tsx"),
  ]);

  assert.match(singleRefresh, /export async function POST/);
  assert.match(singleRefresh, /refreshMarketValue/);
  assert.match(collectionRoute, /refreshMarketValueWithOutcome/);
  assert.doesNotMatch(wineService, /market-values/);
  assert.doesNotMatch(cellarUi, /Refresh Estimated Market Values/);
});
