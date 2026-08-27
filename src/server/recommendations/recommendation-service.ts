import type { StoredWine, WineProfile } from "@/domain/wine";

export interface RecommendationRequest {
  food: string;
  occasion?: string;
  preferences?: { styles?: string[]; grapes?: string[]; countries?: string[] };
}

export interface WineRecommendation {
  wine: StoredWine;
  score: number;
  /** Concise compatibility field for existing recommendation consumers. */
  reason: string;
  headline: string;
  bullets: [string, string, string];
  why: string;
}

type Level = "low" | "medium" | "high";
type Meal = { text: string; words: Set<string>; families: Set<string>; richness: Level; cues: Set<string> };
type ScoreParts = { direct: number; food: number; style: number; structure: number; maturity: number; serving: number; preference: number; availability: number };

/** The single retrieval, scoring, and explanation boundary used by the recommendation experience. */
export class RecommendationService {
  recommend(wines: StoredWine[], request: RecommendationRequest): WineRecommendation[] {
    // Occasion is additional meal precision, not merely a style preference. Combining
    // it here means "creamy", "grilled", and similar details affect every food score.
    const meal = understandMeal(request.food, request.occasion);

    return wines
      .filter((wine) => wine.bottleCount > 0)
      .map((wine) => {
        const parts = scoreWine(wine, meal, request);
        const score = Math.max(0, Math.min(100, Math.round(Object.values(parts).reduce((sum, value) => sum + value, 0))));
        return present(wine, meal, parts, score);
      })
      .sort((a, b) => b.score - a.score || b.wine.confidence - a.wine.confidence || a.wine.id - b.wine.id)
      .slice(0, 3);
  }
}

function scoreWine(wine: StoredWine, meal: Meal, request: RecommendationRequest): ScoreParts {
  const profile = wine.profile;
  const pairingText = profile.foodPairings.join(" ");
  const pairingWords = words(pairingText);
  const pairingFamilies = classify(pairingWords);
  const directWords = overlap(meal.words, pairingWords);
  const sharedFamilies = intersection(meal.families, pairingFamilies);
  const direct = Math.min(32, directWords * 14);
  const food = Math.min(28, sharedFamilies.size * 14);
  const style = styleScore(wine, meal);
  const structure = structureScore(profile, meal);
  const maturity = maturityScore(profile);
  const serving = servingScore(wine, meal);
  const preference = preferenceScore(wine, request);
  // Availability deliberately remains a tie-breaker; it must never drown out the meal.
  const availability = Math.min(3, wine.bottleCount - 1);
  return { direct, food, style, structure, maturity, serving, preference, availability };
}

function styleScore(wine: StoredWine, meal: Meal): number {
  const styleWords = words(`${wine.wineColor ?? ""} ${wine.profile.style.wineStyle ?? ""} ${wine.grapeVarieties.join(" ")}`);
  let score = 0;
  if (meal.families.has("red-meat")) score += hasAny(styleWords, ["red", "cabernet", "syrah", "shiraz", "malbec", "nebbiolo"]) ? 16 : -8;
  if (meal.families.has("delicate-fish") || meal.families.has("sushi")) score += hasAny(styleWords, ["white", "sparkling", "riesling", "sauvignon", "chablis", "champagne"]) ? 16 : -7;
  if (meal.families.has("oily-fish")) score += hasAny(styleWords, ["white", "rosé", "rose", "pinot", "chardonnay", "riesling"]) ? 12 : 0;
  if (meal.families.has("mushroom")) score += hasAny(styleWords, ["pinot", "nebbiolo", "chardonnay", "earthy"]) ? 14 : 0;
  if (meal.families.has("cheese")) score += hasAny(styleWords, ["port", "sweet", "riesling", "sparkling", "full-bodied"]) ? 12 : 0;
  if (meal.families.has("poultry")) score += hasAny(styleWords, ["pinot", "chardonnay", "white", "light-bodied", "medium-bodied"]) ? 10 : 0;
  if (meal.families.has("tomato")) score += hasAny(styleWords, ["sangiovese", "barbera", "chianti", "red"]) ? 12 : 0;
  return score;
}

function structureScore(profile: WineProfile, meal: Meal): number {
  const { body, acidity, tannin, sweetness } = profile.style;
  let score = 0;
  if (body) score += body === meal.richness ? 9 : Math.abs(level(body) - level(meal.richness)) === 1 ? 3 : -5;
  if ((meal.cues.has("creamy") || meal.cues.has("fatty") || meal.families.has("tomato")) && acidity) score += acidity === "high" ? 8 : acidity === "medium" ? 3 : -4;
  if (meal.families.has("red-meat") && tannin) score += tannin === "high" ? 8 : tannin === "medium" ? 4 : -3;
  if ((meal.cues.has("spicy") || meal.families.has("sushi")) && tannin) score += tannin === "low" ? 5 : tannin === "high" ? -7 : 0;
  if (meal.cues.has("spicy") && sweetness) score += sweetness === "medium" ? 5 : sweetness === "high" ? 3 : 0;
  return score;
}

function servingScore(wine: StoredWine, meal: Meal): number {
  let score = 0;
  if (meal.cues.has("formal") && (wine.profile.serving.temperature || wine.profile.serving.decantAdvice)) score += 4;
  if (meal.cues.has("grilled") || meal.cues.has("barbecue")) {
    const text = words(`${wine.profile.style.wineStyle ?? ""} ${wine.profile.summary ?? ""}`);
    if (hasAny(text, ["bold", "smoky", "spicy", "full", "robust"])) score += 7;
  }
  return score;
}

function preferenceScore(wine: StoredWine, request: RecommendationRequest): number {
  const style = overlap(words(request.preferences?.styles?.join(" ") ?? ""), words(wine.profile.style.wineStyle ?? "")) * 4;
  const grape = overlap(words(request.preferences?.grapes?.join(" ") ?? ""), words(wine.grapeVarieties.join(" "))) * 5;
  const country = request.preferences?.countries?.some((item) => item.toLowerCase() === wine.country?.toLowerCase()) ? 5 : 0;
  return Math.min(10, style + grape + country);
}

function present(wine: StoredWine, meal: Meal, parts: ScoreParts, score: number): WineRecommendation {
  const profile = wine.profile;
  const matchedPairing = parts.direct > 0 || parts.food > 0;
  const style = describeStyle(profile);
  const drinking = drinkingText(profile);
  const mealLabel = meal.text;
  const pairing = matchedPairing ? `Profile pairing fits ${mealLabel}` : `Style considered for ${mealLabel}`;
  const headline = matchedPairing ? "A natural pairing" : parts.maturity >= 7 ? "Well timed for the meal" : "The best available fit";
  const evidence: string[] = [];
  if (parts.direct > 0) evidence.push(`its Wine Profile explicitly pairs with ${matchedFoodTerms(meal, profile)}`);
  else if (parts.food > 0) evidence.push("its listed pairings are in the same food family");
  if (parts.structure > 0) evidence.push(`its ${structureEvidence(profile, meal)} suits the dish's ${meal.richness} richness`);
  if (parts.style > 0) evidence.push(`${style.toLowerCase()} is well suited to this type of food`);
  if (parts.serving > 0) evidence.push("its serving profile fits the added meal detail");
  if (!evidence.length) evidence.push("its maturity and style make it the closest available option");
  const name = wine.wineName ?? "This wine";
  const why = `${name} ranks for ${mealLabel} because ${evidence.slice(0, 3).join(", and ")}. ${drinking}. ${availabilityText(wine.bottleCount)}`;
  const reason = matchedPairing ? `Strong match: ${evidence[0]}.` : `${capitalize(evidence[0])}.`;
  return { wine, score, reason, headline, bullets: [pairing, drinking, style], why };
}

function understandMeal(food: string, occasion?: string): Meal {
  const text = [food.trim(), occasion?.trim()].filter(Boolean).join(" — ");
  const allWords = words(`${food} ${occasion ?? ""}`);
  const families = classify(allWords);
  const cues = new Set<string>();
  for (const [cue, terms] of Object.entries(CUES)) if (hasAny(allWords, terms)) cues.add(cue);
  let richness: Level = "medium";
  if (hasAny(allWords, ["steak", "beef", "duck", "lamb", "barbecue", "bbq", "creamy", "cream", "rich", "cheese", "risotto"])) richness = "high";
  if (hasAny(allWords, ["cod", "sole", "sushi", "oyster", "salad", "delicate", "light"])) richness = "low";
  return { text, words: allWords, families, richness, cues };
}

const FAMILIES: Record<string, string[]> = {
  "red-meat": ["steak", "beef", "lamb", "venison", "burger", "barbecue", "bbq"],
  poultry: ["turkey", "chicken", "duck", "goose"],
  "delicate-fish": ["cod", "sole", "haddock", "oyster", "shellfish", "seafood"],
  "oily-fish": ["salmon", "tuna", "mackerel"], sushi: ["sushi", "sashimi"],
  mushroom: ["mushroom", "mushrooms", "porcini", "truffle"], cheese: ["cheese", "cheeses", "cheddar", "brie"],
  tomato: ["pizza", "tomato", "marinara", "bolognese"], pasta: ["pasta", "risotto", "ravioli", "spaghetti"],
};
const CUES: Record<string, string[]> = {
  grilled: ["grilled", "grill", "charred"], creamy: ["creamy", "cream", "butter", "buttery"],
  spicy: ["spicy", "chilli", "chili", "hot"], barbecue: ["barbecue", "bbq", "smoked", "smoky"],
  formal: ["formal", "celebration", "special", "elegant"], fatty: ["fatty", "fried", "rich"],
};

function classify(value: Set<string>): Set<string> { const result = new Set<string>(); for (const [name, terms] of Object.entries(FAMILIES)) if (hasAny(value, terms)) result.add(name); return result; }
function maturityScore(profile: WineProfile): number { switch (profile.drinking.currentMaturity) { case "ready": return 8; case "mature": return 7; case "approaching peak": return 5; case "young": return 1; case "past peak": return -5; default: return 0; } }
function drinkingText(profile: WineProfile): string { const maturity = profile.drinking.currentMaturity; if (maturity === "ready" || maturity === "mature") return "Drinking beautifully now"; if (maturity === "approaching peak") return "Coming into its drinking window"; if (profile.drinking.drinkUntil) return `Enjoy by ${profile.drinking.drinkUntil}`; return "No specific drinking window is stored"; }
function describeStyle(profile: WineProfile): string { const parts = [profile.style.body && `${capitalize(profile.style.body)}-bodied`, profile.style.acidity && `${profile.style.acidity} acidity`, profile.style.tannin && `${profile.style.tannin} tannin`, profile.style.wineStyle].filter(Boolean); return parts.length ? parts.join(" with ") : "Style details are not yet stored"; }
function structureEvidence(profile: WineProfile, meal: Meal): string { const facts = [profile.style.body && `${profile.style.body} body`, profile.style.acidity && `${profile.style.acidity} acidity`, meal.families.has("red-meat") && profile.style.tannin && `${profile.style.tannin} tannin`].filter(Boolean); return facts.join(" and ") || "stored structure"; }
function matchedFoodTerms(meal: Meal, profile: WineProfile): string { const matches = [...meal.words].filter((word) => words(profile.foodPairings.join(" ")).has(word)); return matches.slice(0, 2).join(" and ") || "the dish"; }
function availabilityText(count: number): string { return count === 1 ? "One bottle is currently available in the cellar." : `${count} bottles are currently available in the cellar.`; }
function level(value: Level): number { return value === "low" ? 0 : value === "medium" ? 1 : 2; }
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"]);
function words(value: string): Set<string> { return new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => !STOP_WORDS.has(word))); }
function overlap(left: Set<string>, right: Set<string>): number { return intersection(left, right).size; }
function intersection(left: Set<string>, right: Set<string>): Set<string> { return new Set([...left].filter((item) => right.has(item))); }
function hasAny(wordsToCheck: Set<string>, terms: string[]): boolean { return terms.some((term) => wordsToCheck.has(term)); }
