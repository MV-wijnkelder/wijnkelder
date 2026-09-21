import type { MarketValueMetadata, StoredWine } from "@/domain/wine";
import type { MarketValueProvider } from "./market-value-provider.ts";
import { determineMarketValue } from "./market-value-provider.ts";
import { MarketValueProviderError } from "./openai-market-value-provider.ts";

export const MARKET_VALUE_FRESH_DAYS = 30;
export const MARKET_VALUE_BATCH_SIZE = 3;
export const MARKET_VALUE_PROVIDER_TIMEOUT_MS = 12_000;
export type MarketRefreshOutcome = "updated" | "retained" | "unavailable";
export interface MarketValueStorage { updateMarketValue(id: number, value: number | null, currency: string | null, metadata: MarketValueMetadata): Promise<StoredWine | null>; }

export function isMarketValueFresh(wine: StoredWine, now = new Date()): boolean { return wine.marketValue !== null && ageIsBelow(wine.marketValueMetadata.retrievedAt, MARKET_VALUE_FRESH_DAYS, now); }
export function selectMarketValueBatch(wines: StoredWine[], completedIds: number[], now = new Date(), batchSize = MARKET_VALUE_BATCH_SIZE): StoredWine[] { const completed = new Set(completedIds); return wines.filter((wine) => !completed.has(wine.id) && !isMarketValueFresh(wine, now)).slice(0, batchSize); }

export async function refreshMarketValueWithOutcome(wine: StoredWine, provider: MarketValueProvider, storage: MarketValueStorage, timeoutMs = MARKET_VALUE_PROVIDER_TIMEOUT_MS): Promise<{ wine: StoredWine; outcome: MarketRefreshOutcome }> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs); const attemptedAt = new Date().toISOString();
  try {
    const quote = await determineMarketValue(wine, provider, controller.signal);
    if (quote.value === null) {
      const saved = await preserveAfterFailure(wine, storage, "insufficient_evidence", attemptedAt);
      return { wine: saved, outcome: wine.marketValue === null ? "unavailable" : "retained" };
    }
    const saved = await storage.updateMarketValue(wine.id, quote.value, quote.currency, {
      provider: provider.name, retrievedAt: attemptedAt, sourceUrls: quote.sourceUrls, observationCount: quote.observationCount,
      confidence: quote.confidence, failureCategory: null, lastAttemptedAt: attemptedAt, lastAttemptFailure: null, evidenceTier: quote.evidenceTier,
    });
    if (!saved) throw new Error("Wine not found.");
    return { wine: saved, outcome: "updated" };
  } catch (error) {
    const category = controller.signal.aborted ? "timeout" : error instanceof MarketValueProviderError ? error.category : "provider";
    await preserveAfterFailure(wine, storage, category, attemptedAt);
    if (controller.signal.aborted) throw new MarketValueProviderError("timeout", "Market valuation timed out.");
    throw error;
  } finally { clearTimeout(timer); }
}

export async function refreshMarketValue(wine: StoredWine, provider: MarketValueProvider, storage: MarketValueStorage, timeoutMs = MARKET_VALUE_PROVIDER_TIMEOUT_MS): Promise<StoredWine> { return (await refreshMarketValueWithOutcome(wine, provider, storage, timeoutMs)).wine; }

export async function preserveAfterFailure(wine: StoredWine, storage: MarketValueStorage, category: string, attemptedAt = new Date().toISOString()): Promise<StoredWine> {
  const saved = await storage.updateMarketValue(wine.id, wine.marketValue, wine.marketValueCurrency, { ...wine.marketValueMetadata, lastAttemptedAt: attemptedAt, lastAttemptFailure: category, failureCategory: category });
  if (!saved) throw new Error("Wine not found.");
  return saved;
}
function ageIsBelow(value: string | null, days: number, now: Date): boolean { if (!value) return false; const timestamp = Date.parse(value); return Number.isFinite(timestamp) && now.getTime() - timestamp < days * 86_400_000; }
