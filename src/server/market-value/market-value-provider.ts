import type { Wine } from "@/domain/wine";

export type MarketPriceObservation = { price: number; currency: "EUR"; sourceUrl: string };
export type MarketValueQuote = { value: number | null; currency: "EUR" | null; sourceUrls: string[] };

/** Replaceable boundary around public market-data retrieval. */
export interface MarketValueProvider {
  readonly name: string;
  findPrices(wine: Wine): Promise<MarketPriceObservation[]>;
}

/**
 * Produces one stable value without exposing a price range. The median limits
 * the effect of unusually low/high listings; no observations means unknown.
 */
export async function determineMarketValue(wine: Wine, provider: MarketValueProvider): Promise<MarketValueQuote> {
  const observations = (await provider.findPrices(wine))
    .filter((item) => item.currency === "EUR" && Number.isFinite(item.price) && item.price > 0 && isPublicUrl(item.sourceUrl))
    .sort((left, right) => left.price - right.price);
  if (!observations.length) return { value: null, currency: null, sourceUrls: [] };
  const middle = Math.floor(observations.length / 2);
  const median = observations.length % 2
    ? observations[middle].price
    : (observations[middle - 1].price + observations[middle].price) / 2;
  return {
    value: Math.round(median * 100) / 100,
    currency: "EUR",
    sourceUrls: [...new Set(observations.map((item) => item.sourceUrl))],
  };
}

function isPublicUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
