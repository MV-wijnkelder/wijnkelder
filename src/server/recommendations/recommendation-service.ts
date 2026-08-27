import type { StoredWine } from "@/server/storage/neon-wine-storage";

export interface RecommendationRequest {
  occasion: string;
  food: string;
  preferences?: { styles?: string[]; grapes?: string[]; countries?: string[] };
}

export interface WineRecommendation { wine: StoredWine; score: number; reason: string }

/** Deterministic retrieval boundary intended for both HTTP clients and a future AI tool. */
export class RecommendationService {
  recommend(wines: StoredWine[], request: RecommendationRequest): WineRecommendation[] {
    const occasion = words(request.occasion);
    const food = words(request.food);
    return wines.filter((wine) => wine.bottleCount > 0).map((wine) => {
      const profile = wine.profile;
      const pairingMatches = overlap(food, words(profile.foodPairings.join(" ")));
      const styleMatches = overlap(occasion, words(profile.style.wineStyle ?? ""));
      const preferredStyle = overlap(words(request.preferences?.styles?.join(" ") ?? ""), words(profile.style.wineStyle ?? ""));
      const preferredGrape = overlap(words(request.preferences?.grapes?.join(" ") ?? ""), words(wine.grapeVarieties.join(" ")));
      const preferredCountry = request.preferences?.countries?.some((country) => country.toLowerCase() === wine.country?.toLowerCase()) ? 1 : 0;
      const score = Math.min(100, 35 + pairingMatches * 25 + styleMatches * 10 + preferredStyle * 10 + preferredGrape * 10 + preferredCountry * 10);
      const reason = pairingMatches ? `A strong match for ${request.food.trim() || "the food"}.` : preferredGrape || preferredStyle || preferredCountry ? "Matches your wine preferences." : profile.style.wineStyle ? `${profile.style.wineStyle} suits the occasion.` : "A versatile bottle for this occasion.";
      return { wine, score, reason };
    }).sort((a, b) => b.score - a.score || b.wine.confidence - a.wine.confidence || a.wine.id - b.wine.id).slice(0, 3);
  }
}

function words(value: string): Set<string> { return new Set(value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []); }
function overlap(left: Set<string>, right: Set<string>): number { let count = 0; for (const item of left) if (right.has(item)) count += 1; return count; }
