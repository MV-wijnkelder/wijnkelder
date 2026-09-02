import type { StoredWine, WineProfile } from "@/domain/wine";
import { getDrinkingLifecycle } from "../../lib/drinking-lifecycle.ts";

export interface RecommendationRequest {
  /** Natural-language request from the focused recommendation page. */
  query?: string;
  /** Backward-compatible structured meal input for API consumers. */
  food?: string;
  occasion?: string;
  preferences?: { styles?: string[]; grapes?: string[]; countries?: string[] };
}

export type RecommendationIntent =
  | { kind: "recommendation"; occasion: string; source: "cellar" }
  | { kind: "unknown"; source: "cellar" }
  | { kind: "ready"; source: "cellar" }
  | { kind: "compare"; names: string[]; source: "cellar" }
  | { kind: "inventory"; country: string | null; source: "cellar" };

export interface WineRecommendation {
  wine: StoredWine;
  score: number;
  /** Concise compatibility field for existing recommendation consumers. */
  reason: string;
  headline: string;
  bullets: [string, string, string];
  why: string;
  status: "Excellent Match" | "Good Match";
}

type Level = "low" | "medium" | "high";
type Meal = { text: string; words: Set<string>; families: Set<string>; richness: Level; cues: Set<string> };
type ScoreParts = { direct: number; food: number; style: number; structure: number; maturity: number; preservation: number; serving: number; preference: number; availability: number };

/** The single retrieval, scoring, and explanation boundary used by the recommendation experience. */
export class RecommendationService {
  recommend(wines: StoredWine[], request: RecommendationRequest): WineRecommendation[] {
    // Occasion is additional meal precision, not merely a style preference. Combining
    // it here means "creamy", "grilled", and similar details affect every food score.
    const intent = detectRecommendationIntent(request.query ?? request.food ?? "");
    if (intent.kind === "unknown") return [];
    const subject = request.query && intent.kind === "recommendation" ? intent.occasion : request.food ?? request.query ?? "drink tonight";
    const meal = understandMeal(subject, request.occasion);

    const development = process.env.NODE_ENV === "development";
    const ranked = wines
      .filter((wine) => wine.bottleCount > 0)
      .map((wine) => {
        const parts = scoreWine(wine, meal, request);
        const score = Math.max(0, Math.min(100, Math.round(Object.values(parts).reduce((sum, value) => sum + value, 0))));
        if (development) console.debug("[recommendations] score", { wineId: wine.id, wine: wine.wineName, score, parts });
        return { recommendation: present(wine, meal, parts, score), parts };
      })
      // Rank the complete cellar, but retain a genuine suitability floor. A known
      // compatible style can clear it without naming the exact dish in its profile.
      .filter(({ recommendation, parts }) => {
        const openChoice = hasAny(meal.words, ["surprise", "drink", "tonight"]);
        const reasons = [recommendation.score < (openChoice ? 5 : 24) && "below score threshold", isUnsuitable(recommendation.wine, meal) && "structured avoid, style, maturity, or drinking-window conflict", !openChoice && parts.direct + parts.food < 14 && parts.style + parts.structure < 18 && "insufficient profile evidence"].filter(Boolean);
        if (development && reasons.length) console.debug("[recommendations] excluded", { wineId: recommendation.wine.id, reasons });
        return reasons.length === 0;
      })
      .sort((a, b) => b.recommendation.score - a.recommendation.score || b.recommendation.wine.confidence - a.recommendation.wine.confidence || a.recommendation.wine.id - b.recommendation.wine.id)
      .slice(0, 3)
      .map(({ recommendation }) => recommendation);
    if (development) console.debug("[recommendations] selected", ranked.map(({ wine, score }) => ({ wineId: wine.id, wine: wine.wineName, score })));
    return ranked;
  }
}

/** Deterministic intent parsing keeps raw chat prose out of recommendation scoring. */
export function detectRecommendationIntent(input: string): RecommendationIntent {
  const query = input.trim();
  const lower = query.toLowerCase();
  if (/\b(?:compare|difference between)\b/.test(lower)) {
    const segment = query.replace(/^.*?\b(?:compare|difference between)\b/i, "").replace(/[?.!]/g, "");
    return { kind: "compare", names: segment.split(/\s+(?:and|vs\.?|versus)\s+/i).map((name) => name.trim()).filter(Boolean).slice(0, 2), source: "cellar" };
  }
  if (/\b(?:what|which)\b.*\b(?:italian|french|spanish|german|portuguese|american)\b.*\b(?:wines?|bottles?)\b|\b(?:wines?|bottles?)\b.*\bdo i own\b/.test(lower)) {
    const country = ({ italian: "Italy", french: "France", spanish: "Spain", german: "Germany", portuguese: "Portugal", american: "United States" } as Record<string, string>)[lower.match(/italian|french|spanish|german|portuguese|american/)?.[0] ?? ""] ?? null;
    return { kind: "inventory", country, source: "cellar" };
  }
  if (/\bready to drink\b|\bwines? (?:are|is) ready\b/.test(lower)) return { kind: "ready", source: "cellar" };
  if (/\bsurprise me\b/.test(lower)) return { kind: "recommendation", occasion: "Surprise", source: "cellar" };
  if (/\baperitif\b|\bapéritif\b|\baperitief\b/.test(lower)) return { kind: "recommendation", occasion: "Aperitif", source: "cellar" };
  if (/\b(?:open|drink)\b.*\btonight\b|\btonight\b.*\b(?:open|drink)\b/.test(lower)) return { kind: "recommendation", occasion: "Drink Tonight", source: "cellar" };
  const mealWords = words(query);
  const mealFamilies = classify(mealWords);
  if (mealFamilies.size > 0) {
    const recognised = [...mealWords].find((word) => Object.values(FAMILIES).some((terms) => terms.includes(word)));
    return { kind: "recommendation", occasion: capitalize(recognised ?? query), source: "cellar" };
  }
  return { kind: "unknown", source: "cellar" };
}

function scoreWine(wine: StoredWine, meal: Meal, request: RecommendationRequest): ScoreParts {
  const profile = wine.profile;
  const structured = profile.sommelier;
  const pairingText = [...structured.pairings.excellent, ...structured.pairings.good, ...profile.foodPairings].join(" ");
  const pairingWords = words(pairingText);
  const pairingFamilies = classify(pairingWords);
  const directWords = overlap(meal.words, pairingWords);
  const sharedFamilies = intersection(meal.families, pairingFamilies);
  const occasionMatch = overlap(meal.words, words(structured.occasions.join(" ")));
  const excellentMatch = overlap(meal.words, words(structured.pairings.excellent.join(" ")));
  const goodMatch = overlap(meal.words, words(structured.pairings.good.join(" ")));
  const avoided = overlap(meal.words, words(structured.pairings.avoid.join(" ")));
  const direct = Math.min(46, directWords * 10 + occasionMatch * 32 + excellentMatch * 20 + goodMatch * 10 - avoided * 60);
  const food = Math.min(28, sharedFamilies.size * 14);
  const style = styleScore(wine, meal);
  const structure = structureScore(profile, meal);
  const lifecycle = getDrinkingLifecycle(wine);
  const maturity = lifecycle ? ({ peak: 12, nearPeak: 9, excellent: 5, ready: 1, young: -8, pastPeak: 7, beyondPeak: 2, wellBeyondPeak: -12 } as const)[lifecycle.stage] : maturityScore(profile);
  const preservation = lifecycle ? -lifecycle.preservationScore : 0;
  const serving = servingScore(wine, meal);
  const preference = preferenceScore(wine, request);
  // Availability deliberately remains a tie-breaker; it must never drown out the meal.
  const availability = Math.min(3, wine.bottleCount - 1);
  return { direct, food, style, structure, maturity, preservation, serving, preference, availability };
}

function styleScore(wine: StoredWine, meal: Meal): number {
  const styleWords = wineWords(wine);
  let score = 0;
  if (meal.families.has("red-meat")) score += hasAny(styleWords, ["red", "cabernet", "syrah", "shiraz", "malbec", "nebbiolo", "barolo", "brunello", "chianti", "sangiovese", "ripasso", "amarone", "aglianico"]) ? 18 : hasAny(styleWords, ["white", "sparkling", "delicate"]) ? -8 : 0;
  if (meal.families.has("delicate-fish") || meal.families.has("sushi")) score += hasAny(styleWords, ["white", "sparkling", "riesling", "sauvignon", "chablis", "champagne"]) ? 16 : hasAny(styleWords, ["red", "bold", "full-bodied"]) ? -7 : 0;
  if (meal.families.has("oily-fish")) score += hasAny(styleWords, ["white", "rosé", "rose", "pinot", "chardonnay", "riesling"]) ? 12 : 0;
  if (meal.families.has("mushroom")) score += hasAny(styleWords, ["pinot", "nebbiolo", "chardonnay", "earthy"]) ? 14 : 0;
  if (meal.families.has("cheese")) score += hasAny(styleWords, ["port", "sweet", "riesling", "sparkling", "full-bodied"]) ? 12 : 0;
  if (meal.families.has("poultry")) score += hasAny(styleWords, ["pinot", "chardonnay", "white", "light-bodied", "medium-bodied"]) ? 10 : 0;
  if (meal.families.has("tomato")) score += hasAny(styleWords, ["sangiovese", "barbera", "chianti", "red"]) ? 12 : 0;
  if (meal.families.has("green-vegetable")) score += hasAny(styleWords, ["sauvignon", "grüner", "gruner", "verdicchio", "vermentino", "dry", "crisp", "white"]) ? 14 : hasAny(styleWords, ["red", "bold", "tannic"]) ? -8 : 0;
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
  const personality = words(wine.profile.sommelier.servingPersonality ?? "");
  if (overlap(meal.words, personality)) score += 8;
  if (meal.words.has("aperitif") && hasAny(words(wine.profile.sommelier.wineStyle ?? ""), ["fresh", "crisp", "elegant", "sparkling"])) score += 8;
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
  const drinking = drinkingText(wine);
  const mealLabel = meal.text;
  const pairing = matchedPairing ? `A natural partner for ${mealLabel}` : `A well-balanced choice for ${mealLabel}`;
  const mealEvidence = parts.direct + parts.food + parts.style + parts.structure;
  const status = (parts.direct >= 32 || (score >= 62 && mealEvidence >= 48)) ? "Excellent Match" : "Good Match";
  const headline = status;
  const evidence: string[] = [];
  if (parts.direct > 0) evidence.push(`it is a natural partner for ${matchedFoodTerms(meal, profile)}`);
  else if (parts.food > 0) evidence.push("its savoury character complements the main ingredients");
  if (parts.structure > 0) evidence.push(`its ${structureEvidence(profile, meal)} balances the dish's ${meal.richness} richness`);
  if (parts.style > 0) evidence.push(`${style.toLowerCase()} has the character this dish needs`);
  if (parts.serving > 0) evidence.push("it has enough character for the chosen preparation");
  if (!evidence.length) evidence.push("it is showing well now and complements the dish without overwhelming it");
  const name = wine.wineName ?? "This wine";
  const why = `${name} suits ${mealLabel} because ${evidence.slice(0, 3).join(", and ")}. ${drinking}.`;
  const reason = matchedPairing ? `Strong match: ${evidence[0]}.` : `${capitalize(evidence[0])}.`;
  return { wine, score, reason, headline, bullets: [pairing, drinking, style], why, status };
}

function isUnsuitable(wine: StoredWine, meal: Meal): boolean {
  if (overlap(meal.words, words(wine.profile.sommelier.pairings.avoid.join(" "))) > 0) return true;
  const style = wineWords(wine);
  const delicate = meal.families.has("sushi") || meal.families.has("delicate-fish");
  if (delicate && (wine.profile.style.tannin === "high" || hasAny(style, ["barolo", "nebbiolo", "cabernet", "malbec", "shiraz", "syrah"]))) return true;
  if (meal.cues.has("spicy") && wine.profile.style.tannin === "high") return true;
  return getDrinkingLifecycle(wine)?.stage === "wellBeyondPeak";
}

export function idealWineStyles(food: string, occasion?: string): string[] {
  const families = understandMeal(food, occasion).families;
  if (families.has("sushi")) return ["Chablis", "Dry Riesling", "Champagne"];
  if (families.has("delicate-fish")) return ["Chablis", "Sauvignon Blanc", "Dry Riesling"];
  if (families.has("oily-fish")) return ["White Burgundy", "Dry Riesling", "Pinot Noir"];
  if (families.has("red-meat")) return ["Cabernet Sauvignon", "Syrah", "Malbec"];
  if (families.has("poultry")) return ["Chardonnay", "Pinot Noir", "White Burgundy"];
  if (families.has("mushroom")) return ["Pinot Noir", "Nebbiolo", "White Burgundy"];
  if (families.has("tomato")) return ["Chianti", "Barbera", "Sangiovese"];
  if (families.has("green-vegetable")) return ["Sauvignon Blanc", "Grüner Veltliner", "Verdicchio"];
  if (families.has("cheese")) return ["Tawny Port", "Mature Champagne", "Off-dry Riesling"];
  return ["A wine with matching weight", "A fresh, food-friendly wine", "A mature wine in its drinking window"];
}

function understandMeal(food: string, occasion?: string): Meal {
  const text = [food.trim(), occasion?.trim()].filter(Boolean).join(" — ");
  const allWords = words(`${food} ${occasion ?? ""}`);
  const families = classify(allWords);
  const cues = new Set<string>();
  for (const [cue, terms] of Object.entries(CUES)) if (hasAny(allWords, terms)) cues.add(cue);
  let richness: Level = "medium";
  if (hasAny(allWords, ["steak", "beef", "duck", "lamb", "barbecue", "creamy", "cream", "rich", "cheese", "risotto"])) richness = "high";
  if (hasAny(allWords, ["cod", "sole", "sushi", "oyster", "salad", "delicate", "light"])) richness = "low";
  return { text, words: allWords, families, richness, cues };
}

const FAMILIES: Record<string, string[]> = {
  "red-meat": ["steak", "beef", "lamb", "venison", "burger", "barbecue", "bbq"],
  poultry: ["turkey", "chicken", "duck", "goose"],
  "delicate-fish": ["cod", "sole", "haddock", "seabass", "oyster", "shellfish", "seafood"],
  "oily-fish": ["salmon", "tuna", "mackerel"], sushi: ["sushi", "sashimi"],
  mushroom: ["mushroom", "mushrooms", "porcini", "truffle"], cheese: ["cheese", "cheeses", "cheddar", "brie"],
  tomato: ["pizza", "tomato", "marinara", "bolognese"], pasta: ["pasta", "risotto", "ravioli", "spaghetti"],
  "green-vegetable": ["asparagus", "asperge", "artichoke", "salad"],
};
const CUES: Record<string, string[]> = {
  grilled: ["grilled", "grill", "charred"], creamy: ["creamy", "cream", "butter", "buttery"],
  spicy: ["spicy", "chilli", "chili", "hot"], barbecue: ["barbecue", "bbq", "smoked", "smoky"],
  formal: ["formal", "celebration", "special", "elegant"], fatty: ["fatty", "fried", "rich"],
  roasted: ["roasted", "roast"], raw: ["raw", "tartare", "carpaccio"],
};

function classify(value: Set<string>): Set<string> { const result = new Set<string>(); for (const [name, terms] of Object.entries(FAMILIES)) if (hasAny(value, terms)) result.add(name); return result; }
function maturityScore(profile: WineProfile): number { switch (profile.sommelier.drinkingStage ?? profile.drinking.currentMaturity) { case "ready": return 8; case "mature": return 7; case "approaching peak": return 5; case "young": return 1; case "past peak": return -5; default: return profile.sommelier.ageingPotential ? 1 : 0; } }
function drinkingText(wine: StoredWine): string { const lifecycle = getDrinkingLifecycle(wine); if (lifecycle?.stage === "peak") return "In its best drinking period"; if (lifecycle?.stage === "nearPeak") return "Close to peak with little reason to wait"; if (lifecycle?.materialAgeingUpside) return `Enjoyable now, but worth keeping for its expected peak around ${lifecycle.peakFrom}`; const profile = wine.profile; const maturity = profile.sommelier.drinkingStage ?? profile.drinking.currentMaturity; if (maturity === "ready" || maturity === "mature") return "Drinking beautifully now"; if (maturity === "approaching peak") return "Coming into its drinking window"; if (profile.drinking.drinkUntil) return `Enjoy by ${profile.drinking.drinkUntil}`; if (profile.sommelier.ageingPotential) return profile.sommelier.ageingPotential; return "No specific drinking window is stored"; }
function describeStyle(profile: WineProfile): string { const parts = [profile.style.body && `${capitalize(profile.style.body)}-bodied`, profile.style.acidity && `${profile.style.acidity} acidity`, profile.style.tannin && `${profile.style.tannin} tannin`, profile.sommelier.wineStyle ?? profile.style.wineStyle, profile.sommelier.servingPersonality].filter(Boolean); return parts.length ? parts.join(" with ") : "Style details are not yet stored"; }
function structureEvidence(profile: WineProfile, meal: Meal): string { const facts = [profile.style.body && `${profile.style.body} body`, profile.style.acidity && `${profile.style.acidity} acidity`, meal.families.has("red-meat") && profile.style.tannin && `${profile.style.tannin} tannin`].filter(Boolean); return facts.join(" and ") || "stored structure"; }
function matchedFoodTerms(meal: Meal, profile: WineProfile): string { const profileTerms = words([...profile.sommelier.occasions, ...profile.sommelier.pairings.excellent, ...profile.sommelier.pairings.good, ...profile.foodPairings].join(" ")); const matches = [...meal.words].filter((word) => profileTerms.has(word)); return matches.slice(0, 2).join(" and ") || "the occasion"; }
function level(value: Level): number { return value === "low" ? 0 : value === "medium" ? 1 : 2; }
function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
const STOP_WORDS = new Set(["a", "an", "and", "for", "in", "of", "on", "the", "to", "with"]);
const WORD_ALIASES: Record<string, string> = {
  zalm: "salmon", salomn: "salmon", zeebaars: "seabass", seabass: "seabass", sushi: "sushi",
  biefstuk: "steak", rundvlees: "beef", kip: "chicken", kalkoen: "turkey", asperges: "asparagus",
  asperagus: "asparagus", paddestoel: "mushroom", paddestoelen: "mushroom", champignons: "mushroom",
  barbeque: "barbecue", bbq: "barbecue", gegrild: "grilled", geroosterd: "roasted", rauw: "raw",
  roomsaus: "cream", kaas: "cheese", olijven: "olives", gerookt: "smoked",
};
function words(value: string): Set<string> {
  return new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => !STOP_WORDS.has(word)).map((word) => WORD_ALIASES[word] ?? word));
}
function wineWords(wine: StoredWine): Set<string> { return words(`${wine.wineName ?? ""} ${wine.producer ?? ""} ${wine.region ?? ""} ${wine.wineColor ?? ""} ${wine.profile.style.wineStyle ?? ""} ${wine.profile.sommelier.wineStyle ?? ""} ${wine.profile.sommelier.servingPersonality ?? ""} ${wine.grapeVarieties.join(" ")}`); }
function overlap(left: Set<string>, right: Set<string>): number { return intersection(left, right).size; }
function intersection(left: Set<string>, right: Set<string>): Set<string> { return new Set([...left].filter((item) => right.has(item))); }
function hasAny(wordsToCheck: Set<string>, terms: string[]): boolean { return terms.some((term) => wordsToCheck.has(term)); }
