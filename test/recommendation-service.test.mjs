import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { RecommendationService } from "../src/server/recommendations/recommendation-service.ts";

function wine(id, food, bottles = 1) { const profile = emptyWineProfile(); profile.foodPairings = food; return { id, bottleCount: bottles, confidence: 90, profile, grapeVarieties: [], country: null }; }

test("returns no more than three available wines ranked by relevance", () => {
  const wines = [wine(1, ["grilled steak"]), wine(2, ["fish"]), wine(3, ["steak"]), wine(4, ["steak"]), wine(5, ["steak"], 0)];
  const result = new RecommendationService().recommend(wines, { occasion: "dinner", food: "grilled steak" });
  assert.deepEqual(result.map(({ wine: item }) => item.id), [1, 3, 4]);
  assert.ok(result[0].score > result[1].score);
  assert.match(result[0].reason, /strong match/i);
});
