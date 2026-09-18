import type { MarketValueMetadata, StoredWine } from "@/domain/wine";
import type { MarketValueProvider } from "./market-value-provider.ts";
import { determineMarketValue } from "./market-value-provider.ts";
import { MarketValueProviderError } from "./openai-market-value-provider.ts";

export const MARKET_VALUE_FRESH_DAYS = 30;
export const MARKET_VALUE_RETRY_DAYS = 1;
export const MARKET_VALUE_BATCH_SIZE = 3;
export const MARKET_VALUE_PROVIDER_TIMEOUT_MS = 12_000;

export interface MarketValueStorage { updateMarketValue(id: number, value: number | null, currency: string | null, metadata: MarketValueMetadata): Promise<StoredWine | null>; }

export function isMarketValueFresh(wine: StoredWine, now = new Date()): boolean {
  if (wine.marketValue === null) return false;
  return ageIsBelow(wine.marketValueMetadata.retrievedAt, MARKET_VALUE_FRESH_DAYS, now);
}
export function shouldAutomaticallyValue(wine: StoredWine, now = new Date()): boolean {
  return !isMarketValueFresh(wine, now) && !ageIsBelow(wine.marketValueMetadata.retrievedAt, MARKET_VALUE_RETRY_DAYS, now);
}
export function selectMarketValueBatch(wines: StoredWine[], completedIds: number[], now = new Date(), batchSize = MARKET_VALUE_BATCH_SIZE): StoredWine[] {
  const completed = new Set(completedIds);
  return wines.filter((wine) => !completed.has(wine.id) && !isMarketValueFresh(wine, now)).slice(0, batchSize);
}

export async function refreshMarketValue(wine: StoredWine, provider: MarketValueProvider, storage: MarketValueStorage, timeoutMs = MARKET_VALUE_PROVIDER_TIMEOUT_MS): Promise<StoredWine> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const quote = await determineMarketValue(wine, provider, controller.signal);
    const saved = await storage.updateMarketValue(wine.id, quote.value, quote.currency, {
      provider: provider.name, retrievedAt: new Date().toISOString(), sourceUrls: quote.sourceUrls,
      observationCount: quote.observationCount, confidence: quote.confidence, failureCategory: null,
    });
    if (!saved) throw new Error("Wine not found.");
    return saved;
  } catch (error) {
    if (controller.signal.aborted) throw new MarketValueProviderError("timeout", "Market valuation timed out.");
    throw error;
  } finally { clearTimeout(timer); }
}

function ageIsBelow(value: string | null, days: number, now: Date): boolean {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && now.getTime() - timestamp < days * 86_400_000;
}
