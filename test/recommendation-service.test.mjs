import assert from "node:assert/strict";
import test from "node:test";
import { emptyWineProfile } from "../src/domain/wine.ts";
import { idealWineStyles, RecommendationService } from "../src/server/recommendations/recommendation-service.ts";

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
  assert.equal(result[0].status, "Good Match");
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
  assert.doesNotMatch(result.why, /bottles? (?:is|are) currently available/i);
  assert.doesNotMatch(result.why, /strongest available cellar option/i);
});

test("covers core meals with distinct, quality-gated sommelier choices", () => {
  const cellar = [
    profiledWine(1, { pairings: ["sushi", "cod"], color: "white", style: "Chablis", body: "low", acidity: "high", tannin: "low", sweetness: "low" }),
    profiledWine(2, { pairings: ["salmon", "chicken", "turkey"], color: "white", style: "Chardonnay", body: "medium", acidity: "high", tannin: "low", sweetness: "low" }),
    profiledWine(3, { pairings: ["steak", "barbecue"], color: "red", style: "bold Cabernet", body: "high", acidity: "medium", tannin: "high", sweetness: "low" }),
    profiledWine(4, { pairings: ["mushroom risotto"], color: "red", style: "earthy Pinot Noir", body: "medium", acidity: "high", tannin: "low", sweetness: "low" }),
    profiledWine(5, { pairings: ["pizza"], color: "red", style: "Chianti Sangiovese", body: "medium", acidity: "high", tannin: "medium", sweetness: "low" }),
    profiledWine(6, { pairings: ["cheese platter"], color: "sweet", style: "Tawny Port", body: "high", acidity: "medium", tannin: "low", sweetness: "high" }),
  ];
  const service = new RecommendationService();
  const meals = ["Sushi", "Salmon", "Cod", "Turkey", "Chicken", "Steak", "Barbecue", "Mushroom risotto", "Pizza", "Cheese platter"];
  assert.deepEqual(meals.map((food) => service.recommend(cellar, { food })[0]?.wine.id), [1, 2, 1, 2, 2, 3, 3, 4, 5, 6]);
});

test("returns no compromise and protects an outstanding but unsuitable bottle", () => {
  const barolo = profiledWine(1, { pairings: ["beef"], color: "red", style: "aged Barolo", body: "high", acidity: "high", tannin: "high", sweetness: "low", maturity: "mature" });
  assert.deepEqual(new RecommendationService().recommend([barolo], { food: "sushi", occasion: "casual dinner" }), []);
  assert.deepEqual(idealWineStyles("sushi"), ["Chablis", "Dry Riesling", "Champagne"]);
});

test("reserves Excellent Match for strong pairings and labels alternatives Good Match", () => {
  const exact = profiledWine(1, { pairings: ["grilled steak"], color: "red", style: "bold Cabernet", body: "high", acidity: "medium", tannin: "high", sweetness: "low" });
  const acceptable = profiledWine(2, { pairings: ["beef"], color: "red", style: "medium red", body: "medium", acidity: "medium", tannin: "medium", sweetness: "low" });
  const result = new RecommendationService().recommend([acceptable, exact], { food: "grilled steak" });
  assert.equal(result[0].status, "Excellent Match");
  assert.equal(result[1].status, "Good Match");
  assert.ok(result.length < 3);
});

test("uses the complete Sommelier Profile for occasion-led recommendations", () => {
  const make = (id, name, occasions, excellentWith, goodWith, avoidWith, styles) => {
    const item = profiledWine(id, { pairings: [], color: id === 1 ? "sparkling" : "red", style: styles.join(" "), body: id === 1 ? "low" : "high", acidity: "high", tannin: id === 1 ? "low" : "high", sweetness: "low" });
    item.wineName = name;
    item.profile.sommelier = { bestOccasions: occasions, excellentWith, goodWith, avoidWith, wineStyles: styles, ageingPotential: "Enjoy now or cellar confidently", drinkingStage: "Perfect now", servingPersonality: `A wonderful bottle to open for ${occasions[0].toLowerCase()}.` };
    return item;
  };
  const cellar = [
    make(1, "Firmina", ["Aperitif", "Celebration", "Terrace"], ["Shellfish", "Sushi"], ["Seafood"], ["Steak"], ["Fresh", "Elegant"]),
    make(2, "Barolo", ["Dinner", "Sunday lunch"], ["Steak", "Roast lamb"], ["Mushroom risotto"], ["Sushi"], ["Powerful", "Complex"]),
    make(3, "Brunello", ["Dinner", "Christmas"], ["Roast lamb"], ["Steak"], ["Delicate white fish"], ["Traditional", "Complex"]),
    make(4, "Chianti Classico", ["Lunch", "Dinner"], ["Tomato pasta"], ["Barbecue"], ["Cream desserts"], ["Fresh", "Traditional"]),
    make(5, "German Riesling", ["Aperitif", "Lunch"], ["Sushi"], ["Seafood"], ["Steak"], ["Fresh", "Mineral"]),
  ];
  const result = new RecommendationService().recommend(cellar, { food: "Aperitif" });
  assert.equal(result[0].wine.wineName, "Firmina");
  assert.equal(result[0].status, "Excellent Match");
  assert.match(result[0].why, /Sommelier Profile recommends it for aperitif/i);
  assert.match(result[0].why, /wonderful bottle to open/i);
  assert.deepEqual(cellar.map(({ wineName }) => wineName), ["Firmina", "Barolo", "Brunello", "Chianti Classico", "German Riesling"]);
});

test("Sommelier avoid guidance prevents a superficially attractive pairing", () => {
  const barolo = profiledWine(1, { pairings: ["sushi"], color: "red", style: "Barolo", body: "high", acidity: "high", tannin: "high", sweetness: "low" });
  barolo.profile.sommelier.avoidWith = ["Sushi"];
  assert.deepEqual(new RecommendationService().recommend([barolo], { food: "Sushi" }), []);
});
