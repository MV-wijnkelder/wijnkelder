import assert from "node:assert/strict";
import test from "node:test";
import { mapRecognitionToWine } from "../src/lib/wine-recognition.ts";

const recognition = { producer: "Estate", wineName: "Wine", vintage: "2020", country: "Italy", region: "Piedmont", appellation: "Barolo", grapeVarieties: [], wineColor: "Unknown", bottleSize: "750 ml", alcoholPercentage: 14, confidence: 90, labelsConsistent: true, labelConflicts: [] };

test("legally canonical appellation facts fill missing core identity", () => {
  const wine = mapRecognitionToWine(recognition);
  assert.deepEqual(wine.grapeVarieties, ["Nebbiolo"]);
  assert.equal(wine.wineColor, "Red");
});

test("recognized label facts always take precedence over canonical enrichment", () => {
  const wine = mapRecognitionToWine({ ...recognition, grapeVarieties: ["Label grape"], wineColor: "Label color" });
  assert.deepEqual(wine.grapeVarieties, ["Label grape"]);
  assert.equal(wine.wineColor, "Label color");
});
