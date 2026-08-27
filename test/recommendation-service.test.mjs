import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { RecommendationService } from "../src/server/recommendations/recommendation-service.ts";

function wine(id, food, bottles = 1) { const profile = emptyWineProfile(); profile.foodPairings = food; return { id, bottleCount: bottles, confidence: 90, profile, grapeVarieties: [], country: null }; }

function profiledWine(id, { pairings, color, style, body, acidity, tannin, sweetness, maturity = "ready", summary, bottles = 1 }) {
  const item = wine(id, pairings, bottles);
  item.wineName = `Wine ${id}`;
  item.wineColor = color;
  item.profile.style = { body, acidity, tannin, sweetness, alcohol: null, wineStyle: style };
  item.profile.drinking.currentMaturity = maturity;
  item.profile.summary = summary ?? null;
  return item;
}

test("returns no more than three available wines ranked by relevance", () => {
  const wines = [wine(1, ["grilled steak"]), wine(2, ["fish"]), wine(3, ["steak"]), wine(4, ["steak"]), wine(5, ["steak"], 0)];
  const result = new RecommendationService().recommend(wines, { occasion: "dinner", food: "grilled steak" });
  assert.deepEqual(result.map(({ wine: item }) => item.id), [1, 3, 4]);
  assert.ok(result[0].score > result[1].score);
  assert.match(result[0].reason, /strong match/i);
  assert.equal(result[0].bullets.length, 3);
  assert.match(result[0].why, /currently available/i);
});

test("uses drinking readiness and bottle availability without returning empty inventory", () => {
  const ready = wine(1, ["pasta"]); ready.profile.drinking.currentMaturity = "ready";
  const stocked = wine(2, ["pasta"], 4);
  const unavailable = wine(3, ["pasta"], 0); unavailable.profile.drinking.currentMaturity = "ready";
  const result = new RecommendationService().recommend([stocked, unavailable, ready], { food: "pasta" });
  assert.deepEqual(result.map(({ wine: item }) => item.id), [1, 2]);
  assert.match(result[0].bullets[1], /drinking beautifully now/i);
});

test("meal families produce materially different rankings across a varied cellar", () => {
  const cellar = [
    profiledWine(1, { pairings: ["grilled steak", "beef"], color: "red", style: "bold Cabernet", body: "high", acidity: "medium", tannin: "high", sweetness: "low" }),
    profiledWine(2, { pairings: ["cod", "shellfish"], color: "white", style: "crisp Sauvignon Blanc", body: "low", acidity: "high", tannin: "low", sweetness: "low" }),
    profiledWine(3, { pairings: ["sushi", "sashimi"], color: "white", style: "dry Riesling", body: "low", acidity: "high", tannin: "low", sweetness: "medium" }),
    profiledWine(4, { pairings: ["mushroom risotto", "truffle pasta"], color: "red", style: "earthy Pinot Noir", body: "medium", acidity: "high", tannin: "low", sweetness: "low" }),
    profiledWine(5, { pairings: ["roast turkey", "chicken"], color: "white", style: "Chardonnay", body: "medium", acidity: "medium", tannin: "low", sweetness: "low" }),
  ];
  const service = new RecommendationService();
  const first = (food) => service.recommend(cellar, { food })[0].wine.id;
  assert.deepEqual([first("Turkey"), first("Steak"), first("Cod"), first("Sushi"), first("Pasta with mushrooms")], [5, 1, 2, 3, 4]);
});

test("additional precision changes structural ranking when a better alternative exists", () => {
  const cellar = [
    profiledWine(1, { pairings: ["chicken"], color: "white", style: "soft white", body: "medium", acidity: "low", tannin: "low", sweetness: "low" }),
    profiledWine(2, { pairings: ["chicken"], color: "white", style: "fresh white", body: "high", acidity: "high", tannin: "low", sweetness: "low" }),
  ];
  const service = new RecommendationService();
  assert.equal(service.recommend(cellar, { food: "chicken" })[0].wine.id, 1);
  assert.equal(service.recommend(cellar, { food: "chicken", occasion: "creamy sauce" })[0].wine.id, 2);
});

test("explanations cite stored matching evidence rather than generic claims", () => {
  const selected = profiledWine(1, { pairings: ["salmon"], color: "white", style: "Chardonnay", body: "medium", acidity: "high", tannin: "low", sweetness: "low", bottles: 2 });
  const result = new RecommendationService().recommend([selected], { food: "salmon" })[0];
  assert.match(result.why, /explicitly pairs with salmon/i);
  assert.match(result.why, /high acidity/i);
  assert.match(result.why, /2 bottles are currently available/i);
  assert.doesNotMatch(result.why, /strongest available cellar option/i);
});
