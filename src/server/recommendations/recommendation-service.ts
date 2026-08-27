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

/** The single retrieval and explanation boundary used by the recommendation experience. */
export class RecommendationService {
  recommend(wines: StoredWine[], request: RecommendationRequest): WineRecommendation[] {
    const food = request.food.trim();
    const foodWords = words(food);
    const contextWords = words(request.occasion ?? "");

    return wines
      .filter((wine) => wine.bottleCount > 0)
      .map((wine) => {
        const profile = wine.profile;
        const pairingMatches = overlap(foodWords, words(profile.foodPairings.join(" ")));
        const styleMatches = overlap(contextWords, words(profile.style.wineStyle ?? ""));
        const preferredStyle = overlap(words(request.preferences?.styles?.join(" ") ?? ""), words(profile.style.wineStyle ?? ""));
        const preferredGrape = overlap(words(request.preferences?.grapes?.join(" ") ?? ""), words(wine.grapeVarieties.join(" ")));
        const preferredCountry = request.preferences?.countries?.some((country) => country.toLowerCase() === wine.country?.toLowerCase()) ? 1 : 0;
        const maturity = maturityScore(profile);
        // Quantity is deliberately a small tie-breaker: relevance matters most, while a
        // well-stocked bottle is less costly to choose than the cellar's final one.
        const availability = Math.min(4, wine.bottleCount - 1);
        const score = Math.min(100, 30 + pairingMatches * 25 + styleMatches * 8 + preferredStyle * 10 + preferredGrape * 10 + preferredCountry * 10 + maturity + availability);
        return present(wine, food, pairingMatches > 0, score);
      })
      .sort((a, b) => b.score - a.score || b.wine.confidence - a.wine.confidence || a.wine.id - b.wine.id)
      .slice(0, 3);
  }
}

function present(wine: StoredWine, food: string, pairingMatch: boolean, score: number): WineRecommendation {
  const profile = wine.profile;
  const style = describeStyle(profile);
  const maturity = profile.drinking.currentMaturity;
  const pairing = pairingMatch ? `Excellent with ${food}` : `A versatile match for ${food}`;
  const drinking = maturity === "ready" || maturity === "mature" ? "Drinking beautifully now" : maturity === "approaching peak" ? "Coming into its drinking window" : profile.drinking.drinkUntil ? `Enjoy by ${profile.drinking.drinkUntil}` : "Ready to enjoy from your cellar";
  const headline = pairingMatch ? "A natural pairing" : maturity === "ready" || maturity === "mature" ? "Beautifully timed" : "A thoughtful match";
  const location = [wine.region, wine.country].filter(Boolean).join(", ") || "its region";
  const notes = profile.summary ?? profile.style.wineStyle ?? "a balanced, food-friendly character";
  const vintage = profile.vintageRemarks && wine.vintage ? ` For this ${wine.vintage} vintage, ${lowerFirst(profile.vintageRemarks)}` : "";
  const why = `${wine.wineName ?? "This wine"} works with ${food} because its ${style.toLowerCase()} profile brings balance rather than overpowering the dish. ${pairingMatch ? "The Wine Profile specifically identifies closely related flavours among its food pairings." : "Its structure and style make it the strongest available cellar option for the meal."} From ${location}, it offers ${lowerFirst(notes)}. ${drinking}. There ${wine.bottleCount === 1 ? "is one bottle" : `are ${wine.bottleCount} bottles`} currently available, so this recommendation reflects your real cellar inventory.${vintage}`;
  const reason = pairingMatch ? `A strong match for ${food}.` : headline;
  return { wine, score, reason, headline, bullets: [pairing, drinking, style], why };
}

function maturityScore(profile: WineProfile): number {
  switch (profile.drinking.currentMaturity) { case "ready": return 12; case "mature": return 10; case "approaching peak": return 7; case "young": return 2; case "past peak": return -5; default: return 0; }
}

function describeStyle(profile: WineProfile): string {
  const parts = [profile.style.body && `${capitalize(profile.style.body)}-bodied`, profile.style.acidity && `${profile.style.acidity} acidity`, profile.style.wineStyle].filter(Boolean);
  return parts.length ? parts.join(" with ") : "Balanced and food-friendly";
}

function capitalize(value: string): string { return value.charAt(0).toUpperCase() + value.slice(1); }
function lowerFirst(value: string): string { return value.charAt(0).toLowerCase() + value.slice(1); }
function words(value: string): Set<string> { return new Set(value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []); }
function overlap(left: Set<string>, right: Set<string>): number { let count = 0; for (const item of left) if (right.has(item)) count += 1; return count; }
