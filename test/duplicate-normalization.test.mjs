import assert from "node:assert/strict";
import test from "node:test";
import { duplicateKey } from "../src/lib/wine-normalization.ts";

const wine = (producer, wineName, vintage) => ({
  producer, wineName, vintage, country: null, region: null, appellation: null,
  grapeVarieties: [], wineColor: null, bottleSize: null,
  alcoholPercentage: null, confidence: 90,
});

test("duplicate keys ignore case, whitespace, and punctuation", () => {
  const canonical = duplicateKey(wine("Château Example", "Cuvée-Rouge", "2022"));
  assert.equal(canonical, duplicateKey(wine("  CHÂTEAU   EXAMPLE ", "Cuvée Rouge!", " 2022 ")));
});

test("different producer, wine, or vintage remains distinct", () => {
  const canonical = duplicateKey(wine("Estate", "Reserve", "2022"));
  assert.notEqual(canonical, duplicateKey(wine("Other Estate", "Reserve", "2022")));
  assert.notEqual(canonical, duplicateKey(wine("Estate", "Grand Reserve", "2022")));
  assert.notEqual(canonical, duplicateKey(wine("Estate", "Reserve", "2021")));
});
