import type { Wine } from "@/domain/wine";
import type { MarketPriceObservation, MarketValueProvider } from "./market-value-provider.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";
const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] } as const;
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] } as const;
const schema = { type: "object", properties: { observations: { type: "array", items: { type: "object", properties: {
  price: { type: "number", exclusiveMinimum: 0 }, currency: { type: "string" }, sourceUrl: { type: "string" }, merchant: nullableString,
  producer: nullableString, wineName: nullableString, vintage: nullableString, bottleSize: nullableString, packageQuantity: nullableNumber,
  offerType: { type: "string", enum: ["retail", "winery", "marketplace", "editorial", "auction", "other"] }, available: { type: "boolean" },
  exactMatch: { type: "boolean" }, evidenceQuality: { type: "string", enum: ["low", "medium", "high"] },
}, required: ["price", "currency", "sourceUrl", "merchant", "producer", "wineName", "vintage", "bottleSize", "packageQuantity", "offerType", "available", "exactMatch", "evidenceQuality"], additionalProperties: false } } }, required: ["observations"], additionalProperties: false } as const;

export class OpenAIMarketValueProvider implements MarketValueProvider {
  readonly name = "openai-web-search";
  private readonly apiKey: string;
  constructor(apiKey: string) { this.apiKey = apiKey; }
  async findPrices(wine: Wine, options?: { signal?: AbortSignal }): Promise<MarketPriceObservation[]> {
    const identity = { producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage, bottleSize: wine.bottleSize, appellation: wine.appellation, region: wine.region, country: wine.country };
    const response = await fetch(RESPONSES_URL, { method: "POST", signal: options?.signal, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
      model: "gpt-4.1-mini", tools: [{ type: "web_search_preview", search_context_size: "medium" }],
      input: `Research multiple current public retail offers for this wine: ${JSON.stringify(identity)}. Search in this order: (1) exact producer and cuvée, exact vintage and bottle size; (2) the exact wine in a clearly stated vintage within two years; (3) the exact wine when a credible retailer does not show a vintage. Prefer EUR listings from winery EUR/European shops, specialist wine merchants, established Dutch, Belgian, German, French or Italian/EU retailers, and reputable marketplaces—even when the producer is outside Europe. Return every useful independent offer, not merely the first result. Report the numeric price and currency exactly as printed; never convert or relabel a foreign currency as EUR. Explicitly capture observed merchant, producer, wine/cuvée, vintage (null when genuinely not shown), bottle size, package bottle count, availability, source type and direct HTTPS product URL. Exclude snippets, generic producer/category pages, editorial or tasting pages, auctions, restaurants, unavailable pages, gift/tasting packs and uncertain cases or multipacks. Do not calculate a market value. exactMatch means all observed identity, vintage and bottle/package fields exactly match; application code will independently validate every observation and calculate the estimate.`,
      text: { format: { type: "json_schema", name: "market_price_evidence", strict: true, schema } },
    }) });
    if (!response.ok) throw providerError(response.status);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new MarketValueProviderError("invalid_response", "Market data provider returned an invalid response.");
    const parsed = JSON.parse(text) as { observations?: MarketPriceObservation[] };
    return Array.isArray(parsed.observations) ? parsed.observations : [];
  }
}
export type MarketValueFailureCategory = "authentication" | "quota_or_rate_limit" | "timeout" | "provider" | "invalid_response";
export class MarketValueProviderError extends Error {
  readonly category: MarketValueFailureCategory;
  constructor(category: MarketValueFailureCategory, message: string) { super(message); this.category = category; }
}
function providerError(status: number): MarketValueProviderError {
  if (status === 401 || status === 403) return new MarketValueProviderError("authentication", "Market valuation is not configured correctly.");
  if (status === 429 || status === 402) return new MarketValueProviderError("quota_or_rate_limit", "Market valuation is temporarily unavailable.");
  return new MarketValueProviderError("provider", `Market data provider returned ${status}.`);
}
