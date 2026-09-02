import assert from "node:assert/strict";
import test from "node:test";
import { duplicateKey, normalizeCategory, normalizeWineCategories } from "../src/lib/wine-normalization.ts";

const wine = (producer, wineName, vintage) => ({
  producer, wineName, vintage, country: null, region: null, appellation: null,
  grapeVarieties: [], wineColor: null, bottleSize: null,
  alcoholPercentage: null, confidence: 90,
});

test("canonical categories normalize capitalization and regional aliases", () => {
  assert.equal(normalizeCategory(" RED "), "Red");
  assert.equal(normalizeCategory("Toscana"), "Tuscany");
  assert.equal(normalizeCategory("tuscany"), "Tuscany");
  const normalized = normalizeWineCategories({ ...wine("Estate", "Reserve", "2022"), country: "ITALY", region: "toscana", wineColor: "red", grapeVarieties: ["sangiovese", "SANGIOVESE"] });
  assert.deepEqual({ country: normalized.country, region: normalized.region, colour: normalized.wineColor, grapes: normalized.grapeVarieties }, { country: "Italy", region: "Tuscany", colour: "Red", grapes: ["Sangiovese"] });
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

test("wine colour is restricted to the three canonical values", () => {
  for (const [source, expected] of [["RED", "Red"], ["white", "White"], ["rose", "Rosé"], ["Rosè", "Rosé"], ["Rosé", "Rosé"], ["sparkling", null]]) {
    assert.equal(normalizeWineCategories({ ...wine("Estate", "Reserve", "2022"), wineColor: source }).wineColor, expected);
  }
});
