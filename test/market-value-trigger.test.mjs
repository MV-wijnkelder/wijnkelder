import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("ordinary wine reads and writes cannot trigger market research", async () => {
  const [collectionRoute, wineRoute] = await Promise.all([
    readSource("../src/app/api/wines/route.ts"),
    readSource("../src/app/api/wines/[id]/route.ts"),
  ]);

  for (const source of [collectionRoute, wineRoute]) {
    assert.doesNotMatch(source, /populateMarketValue|marketValueProvider|refreshMarketValue/);
  }
});

test("web-backed valuation remains confined to explicit POST refresh routes", async () => {
  const [singleRefresh, cellarRefresh] = await Promise.all([
    readSource("../src/app/api/wines/[id]/market-value/route.ts"),
    readSource("../src/app/api/wines/market-values/route.ts"),
  ]);

  assert.match(singleRefresh, /export async function POST/);
  assert.match(singleRefresh, /refreshMarketValue/);
  assert.match(cellarRefresh, /export async function POST/);
  assert.match(cellarRefresh, /refreshMarketValueWithOutcome/);
});
