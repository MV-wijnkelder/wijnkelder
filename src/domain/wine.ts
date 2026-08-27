/**
 * Canonical wine entity used throughout the application.
 *
 * Unknown scalar values are represented by `null`; an unknown grape blend is
 * represented by an empty array. Keep persistence concerns out of this model.
 */
export interface Wine {
  producer: string | null;
  wineName: string | null;
  vintage: string | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineColor: string | null;
  bottleSize: string | null;
  alcoholPercentage: number | null;
  confidence: number;
  /** Enrichment kept as one extensible document so new companion attributes do not require reshaping the wine identity. */
  profile: WineProfile;
}

export type Maturity = "young" | "approaching peak" | "ready" | "mature" | "past peak";
export type Intensity = "low" | "medium" | "high";

export interface WineProfile {
  serving: { temperature: string | null; decantAdvice: string | null };
  drinking: { drinkFrom: string | null; drinkUntil: string | null; currentMaturity: Maturity | null };
  style: {
    body: Intensity | null; acidity: Intensity | null; tannin: Intensity | null;
    sweetness: Intensity | null; alcohol: Intensity | null; wineStyle: string | null;
  };
  foodPairings: string[];
  summary: string | null;
}

export function emptyWineProfile(): WineProfile {
  return {
    serving: { temperature: null, decantAdvice: null },
    drinking: { drinkFrom: null, drinkUntil: null, currentMaturity: null },
    style: { body: null, acidity: null, tannin: null, sweetness: null, alcohol: null, wineStyle: null },
    foodPairings: [], summary: null,
  };
}
