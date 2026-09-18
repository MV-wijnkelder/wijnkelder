import type { Wine } from "@/domain/wine";

export type EvidenceQuality = "low" | "medium" | "high";
export type MarketPriceObservation = {
  price: number;
  currency: string;
  sourceUrl: string;
  merchant: string | null;
  producer: string | null;
  wineName: string | null;
  vintage: string | null;
  bottleSize: string | null;
  packageQuantity: number | null;
  offerType: "retail" | "winery" | "marketplace" | "editorial" | "auction" | "other";
  available: boolean;
  exactMatch: boolean;
  evidenceQuality: EvidenceQuality;
};
export type MarketValueQuote = {
  value: number | null;
  currency: "EUR" | null;
  sourceUrls: string[];
  observationCount: number;
  confidence: "unavailable" | "low" | "medium" | "high";
};

export interface MarketValueProvider {
  readonly name: string;
  findPrices(wine: Wine, options?: { signal?: AbortSignal }): Promise<MarketPriceObservation[]>;
}

/** Canonical, deterministic validation and calculation used by every valuation entry point. */
export async function determineMarketValue(wine: Wine, provider: MarketValueProvider, signal?: AbortSignal): Promise<MarketValueQuote> {
  const candidates = (await provider.findPrices(wine, { signal }))
    .filter((item) => validateObservation(wine, item));
  const independent = [...new Map(candidates.map((item) => [merchantKey(item), item])).values()];
  const eligible = independent.length > 1
    ? independent
    : independent.filter((item) => item.exactMatch && item.evidenceQuality === "high");
  if (!eligible.length) return unavailableQuote();

  const sorted = eligible.toSorted((a, b) => a.price - b.price);
  const initialMedian = median(sorted.map((item) => item.price));
  const clustered = sorted.length >= 3
    ? sorted.filter((item) => Math.abs(item.price - initialMedian) <= Math.max(5, initialMedian * .35))
    : sorted;
  const accepted = clustered.length >= 2 ? clustered : sorted;
  return {
    value: Math.round(median(accepted.map((item) => item.price)) * 100) / 100,
    currency: "EUR",
    sourceUrls: accepted.map((item) => item.sourceUrl),
    observationCount: accepted.length,
    confidence: accepted.length >= 3 ? "high" : accepted.length === 2 ? "medium" : "low",
  };
}

export function validateObservation(wine: Wine, item: MarketPriceObservation): boolean {
  if (item.currency.trim().toUpperCase() !== "EUR") return false; // Never relabel a foreign number as EUR.
  if (!Number.isFinite(item.price) || item.price <= 0 || !item.available || !item.exactMatch) return false;
  if (!["retail", "winery", "marketplace"].includes(item.offerType) || !isPublicUrl(item.sourceUrl)) return false;
  if (item.packageQuantity !== 1) return false;
  if (!identityMatches(wine.producer, item.producer) || !identityMatches(wine.wineName, item.wineName)) return false;
  if (wine.vintage && normalize(wine.vintage) !== normalize(item.vintage)) return false;
  const expectedMl = bottleMillilitres(wine.bottleSize);
  const observedMl = bottleMillilitres(item.bottleSize);
  if (expectedMl === null || observedMl === null || expectedMl !== observedMl) return false;
  return Boolean(item.merchant?.trim());
}

function identityMatches(expected: string | null, observed: string | null): boolean {
  if (!expected || !observed) return false;
  const left = normalize(expected); const right = normalize(observed);
  return left === right || (left.length >= 5 && right.length >= 5 && (left.includes(right) || right.includes(left)));
}
function normalize(value: string | null): string { return (value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function bottleMillilitres(value: string | null): number | null {
  const match = value?.toLowerCase().match(/([\d.,]+)\s*(ml|cl|l)\b/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * (match[2] === "l" ? 1000 : match[2] === "cl" ? 10 : 1)) : null;
}
function merchantKey(item: MarketPriceObservation): string {
  try { return new URL(item.sourceUrl).hostname.replace(/^www\./, "").toLowerCase(); }
  catch { return normalize(item.merchant); }
}
function median(values: number[]): number { const middle = Math.floor(values.length / 2); return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2; }
function isPublicUrl(value: string): boolean { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function unavailableQuote(): MarketValueQuote { return { value: null, currency: null, sourceUrls: [], observationCount: 0, confidence: "unavailable" }; }
