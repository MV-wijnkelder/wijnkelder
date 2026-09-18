import type { Wine } from "@/domain/wine";

export type EvidenceQuality = "low" | "medium" | "high";
export type EvidenceTier = "exact" | "nearby" | "unknown";
export type ObservationRejectionReason =
  | "wrong_currency" | "producer_mismatch" | "wine_mismatch" | "vintage_mismatch"
  | "bottle_size_mismatch" | "package_uncertain" | "merchant_missing"
  | "source_not_eligible" | "not_available" | "insufficient_identity" | "invalid_url" | "invalid_price";
export type MarketPriceObservation = {
  price: number; currency: string; sourceUrl: string; merchant: string | null;
  producer: string | null; wineName: string | null; vintage: string | null;
  bottleSize: string | null; packageQuantity: number | null;
  offerType: "retail" | "winery" | "marketplace" | "editorial" | "auction" | "other";
  available: boolean; exactMatch: boolean; evidenceQuality: EvidenceQuality;
};
export type MarketValueQuote = {
  value: number | null; currency: "EUR" | null; sourceUrls: string[];
  observationCount: number; confidence: "unavailable" | "low" | "medium" | "high";
  evidenceTier: EvidenceTier | null;
  /** Counts only reason codes; raw provider payloads are deliberately never retained or logged. */
  rejectionReasons: Partial<Record<ObservationRejectionReason, number>>;
};
export interface MarketValueProvider {
  readonly name: string;
  findPrices(wine: Wine, options?: { signal?: AbortSignal }): Promise<MarketPriceObservation[]>;
}

/** Canonical, deterministic validation and calculation used by every valuation entry point. */
export async function determineMarketValue(wine: Wine, provider: MarketValueProvider, signal?: AbortSignal): Promise<MarketValueQuote> {
  const observations = await provider.findPrices(wine, { signal });
  const rejectionReasons: MarketValueQuote["rejectionReasons"] = {};
  const candidates: Array<{ observation: MarketPriceObservation; tier: EvidenceTier }> = [];
  for (const observation of observations) {
    const result = classifyObservation(wine, observation);
    if (result.accepted) candidates.push({ observation, tier: result.tier });
    else rejectionReasons[result.reason] = (rejectionReasons[result.reason] ?? 0) + 1;
  }
  const independent = [...new Map(candidates.map((candidate) => [merchantKey(candidate.observation), candidate])).values()];
  const exact = independent.filter(({ tier }) => tier === "exact");
  const nearby = independent.filter(({ tier }) => tier === "nearby");
  const unknown = independent.filter(({ tier }) => tier === "unknown");
  // Better evidence cannot be outvoted by a larger set of lower-tier listings.
  const selected = exact.length ? exact : nearby.length ? nearby : unknown;
  const eligible = selected.length > 1 ? selected : selected.filter(({ observation }) => observation.evidenceQuality === "high");
  if (!eligible.length) return unavailableQuote(rejectionReasons);

  const sorted = eligible.map(({ observation }) => observation).toSorted((a, b) => a.price - b.price);
  const initialMedian = median(sorted.map(({ price }) => price));
  const clustered = sorted.length >= 3 ? sorted.filter(({ price }) => Math.abs(price - initialMedian) <= Math.max(5, initialMedian * .35)) : sorted;
  const accepted = clustered.length >= 2 ? clustered : sorted;
  const tier = eligible[0].tier;
  return {
    value: Math.round(median(accepted.map(({ price }) => price)) * 100) / 100,
    currency: "EUR", sourceUrls: accepted.map(({ sourceUrl }) => sourceUrl), observationCount: accepted.length,
    confidence: tier === "exact" ? (accepted.length >= 2 ? "high" : "medium") : tier === "nearby" ? (accepted.length >= 2 ? "medium" : "low") : "low",
    evidenceTier: tier, rejectionReasons,
  };
}

export type ObservationClassification =
  | { accepted: true; tier: EvidenceTier }
  | { accepted: false; reason: ObservationRejectionReason };

/** Safe diagnostic classification without retaining source payloads or secrets. */
export function classifyObservation(wine: Wine, item: MarketPriceObservation): ObservationClassification {
  if (item.currency.trim().toUpperCase() !== "EUR") return { accepted: false, reason: "wrong_currency" };
  if (!Number.isFinite(item.price) || item.price <= 0) return { accepted: false, reason: "invalid_price" };
  if (!item.available) return { accepted: false, reason: "not_available" };
  if (!item.merchant?.trim()) return { accepted: false, reason: "merchant_missing" };
  if (!isPublicUrl(item.sourceUrl)) return { accepted: false, reason: "invalid_url" };
  if (!["retail", "winery", "marketplace"].includes(item.offerType) || item.evidenceQuality === "low") return { accepted: false, reason: "source_not_eligible" };
  if (item.packageQuantity !== 1) return { accepted: false, reason: "package_uncertain" };
  if (!wine.producer || !wine.wineName || !item.producer || !item.wineName) return { accepted: false, reason: "insufficient_identity" };
  if (!identityMatches(wine.producer, item.producer, "producer")) return { accepted: false, reason: "producer_mismatch" };
  if (!identityMatches(wine.wineName, item.wineName, "wine")) return { accepted: false, reason: "wine_mismatch" };
  const expectedMl = bottleMillilitres(wine.bottleSize); const observedMl = bottleMillilitres(item.bottleSize);
  if (expectedMl === null || observedMl === null || expectedMl !== observedMl) return { accepted: false, reason: "bottle_size_mismatch" };
  const expectedVintage = vintageYear(wine.vintage); const observedVintage = vintageYear(item.vintage);
  if (expectedVintage !== null && observedVintage !== null) {
    if (expectedVintage === observedVintage) return { accepted: true, tier: "exact" };
    if (Math.abs(expectedVintage - observedVintage) <= 2) return { accepted: true, tier: "nearby" };
    return { accepted: false, reason: "vintage_mismatch" };
  }
  if (observedVintage === null) return { accepted: true, tier: "unknown" };
  return { accepted: false, reason: "vintage_mismatch" };
}

export function validateObservation(wine: Wine, item: MarketPriceObservation): boolean { return classifyObservation(wine, item).accepted; }

const CLASSIFICATION_WORDS = new Set(["doc", "docg", "dop", "igt", "aoc", "aop", "riserva", "reserve", "classico"]);
function identityMatches(expected: string, observed: string, kind: "producer" | "wine"): boolean {
  const left = tokens(expected, kind); const right = tokens(observed, kind);
  if (!left.length || !right.length) return false;
  if (left.join(" ") === right.join(" ")) return true;
  // Require every canonical identity token. This tolerates appellation text around a cuvee,
  // without fuzzy edit-distance matching that could confuse sibling wines.
  return left.every((token) => right.includes(token));
}
function tokens(value: string, kind: "producer" | "wine"): string[] {
  const normalized = normalize(value).split(" ").filter(Boolean);
  return kind === "wine" ? normalized.filter((token) => !CLASSIFICATION_WORDS.has(token)) : normalized;
}
function normalize(value: string | null): string { return (value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function vintageYear(value: string | null): number | null { const match = value?.match(/\b(19|20)\d{2}\b/); return match ? Number(match[0]) : null; }
function bottleMillilitres(value: string | null): number | null { const match = value?.toLowerCase().match(/([\d.,]+)\s*(ml|cl|l)\b/); if (!match) return null; const amount = Number(match[1].replace(",", ".")); return Number.isFinite(amount) ? Math.round(amount * (match[2] === "l" ? 1000 : match[2] === "cl" ? 10 : 1)) : null; }
function merchantKey(item: MarketPriceObservation): string { try { return new URL(item.sourceUrl).hostname.replace(/^www\./, "").toLowerCase(); } catch { return normalize(item.merchant); } }
function median(values: number[]): number { const middle = Math.floor(values.length / 2); return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2; }
function isPublicUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname); } catch { return false; } }
function unavailableQuote(rejectionReasons: MarketValueQuote["rejectionReasons"]): MarketValueQuote { return { value: null, currency: null, sourceUrls: [], observationCount: 0, confidence: "unavailable", evidenceTier: null, rejectionReasons }; }
