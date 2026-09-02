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
  /** Provider-neutral estimated current value of one bottle. Never a stored total. */
  marketValue: number | null;
  marketValueCurrency: string | null;
  /** Internal cache/provenance for the market-data adapter. Never rendered to users. */
  marketValueMetadata: MarketValueMetadata;
  /** Enrichment kept as one extensible document so new companion attributes do not require reshaping the wine identity. */
  profile: WineProfile;
  /** Lifecycle dates for AI enrichment; deliberately separate from user-owned wine data. */
  profileMetadata: WineProfileMetadata;
  /** Cellar/workbook data that is not part of the identity printed on a label. */
  cellar: CellarDetails;
}

export interface StoredWine extends Wine {
  id: number;
  bottleCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Canonical home for the inventory columns used by the MCHRDV workbook.
 * `workbookExtras` preserves columns that are added to a workbook later without
 * manufacturing values or requiring a lossy import/export cycle.
 */
export interface CellarDetails {
  storageLocation: string | null;
  rack: string | null;
  shelf: string | null;
  position: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseCurrency: string | null;
  purchasedFrom: string | null;
  tastingNotes: string | null;
  rating: number | null;
  lastTastedAt: string | null;
  sourceWorkbookRow: number | null;
  workbookExtras: Record<string, string | number | boolean | null>;
}

export type Maturity = "young" | "approaching peak" | "ready" | "mature" | "past peak";
export type Intensity = "low" | "medium" | "high";
export type PairingQuality = "excellent" | "good" | "avoid";

/** Recommendation facts used by the cellar sommelier. Kept inside the canonical profile. */
export interface SommelierProfile {
  occasions: string[];
  pairings: Record<PairingQuality, string[]>;
  wineStyle: string | null;
  ageingPotential: string | null;
  drinkingStage: Maturity | null;
  servingPersonality: string | null;
}

export interface WineProfile {
  sommelier: SommelierProfile;
  /** Structured sensory guidance; these are sommelier suggestions, not user tasting notes. */
  tasting: {
    appearance: string | null;
    aromas: string[];
    flavors: string[];
    finish: string | null;
  };
  serving: { temperature: string | null; decantAdvice: string | null };
  drinking: {
    drinkFrom: string | null;
    /** Start and end of the best period, distinct from earliest drinkability. */
    peakFrom: string | null;
    peakUntil: string | null;
    drinkUntil: string | null;
    currentMaturity: Maturity | null;
  };
  style: {
    body: Intensity | null; acidity: Intensity | null; tannin: Intensity | null;
    sweetness: Intensity | null; alcohol: Intensity | null; wineStyle: string | null;
  };
  foodPairings: string[];
  summary: string | null;
  wineryInformation: string | null;
  vintageRemarks: string | null;
}

export interface WineProfileMetadata {
  generatedAt: string | null;
  lastRefreshedAt: string | null;
}

export interface MarketValueMetadata {
  provider: string | null;
  retrievedAt: string | null;
  sourceUrls: string[];
}

/** Provider-independent AI profile result. Market valuation has a dedicated provider boundary. */
export interface WineEnrichment {
  profile: WineProfile;
}

export function emptyMarketValueMetadata(): MarketValueMetadata {
  return { provider: null, retrievedAt: null, sourceUrls: [] };
}

export function emptyWineProfileMetadata(): WineProfileMetadata {
  return { generatedAt: null, lastRefreshedAt: null };
}

export function emptyWineProfile(): WineProfile {
  return {
    sommelier: { occasions: [], pairings: { excellent: [], good: [], avoid: [] }, wineStyle: null, ageingPotential: null, drinkingStage: null, servingPersonality: null },
    tasting: { appearance: null, aromas: [], flavors: [], finish: null },
    serving: { temperature: null, decantAdvice: null },
    drinking: { drinkFrom: null, peakFrom: null, peakUntil: null, drinkUntil: null, currentMaturity: null },
    style: { body: null, acidity: null, tannin: null, sweetness: null, alcohol: null, wineStyle: null },
    foodPairings: [], summary: null, wineryInformation: null, vintageRemarks: null,
  };
}

export function emptyCellarDetails(): CellarDetails {
  return {
    storageLocation: null, rack: null, shelf: null, position: null,
    purchaseDate: null, purchasePrice: null, purchaseCurrency: null, purchasedFrom: null,
    tastingNotes: null, rating: null, lastTastedAt: null, sourceWorkbookRow: null,
    workbookExtras: {},
  };
}
