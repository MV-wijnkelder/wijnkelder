import type { MarketValueMetadata, StoredWine } from "@/domain/wine";
import type { MarketValueProvider } from "./market-value-provider.ts";
import { determineMarketValue } from "./market-value-provider.ts";

export interface MarketValueStorage {
  updateMarketValue(id: number, value: number | null, currency: string | null, metadata: MarketValueMetadata): Promise<StoredWine | null>;
}

export async function refreshMarketValue(wine: StoredWine, provider: MarketValueProvider, storage: MarketValueStorage): Promise<StoredWine> {
  const quote = await determineMarketValue(wine, provider);
  const saved = await storage.updateMarketValue(wine.id, quote.value, quote.currency, {
    provider: provider.name,
    retrievedAt: new Date().toISOString(),
    sourceUrls: quote.sourceUrls,
  });
  if (!saved) throw new Error("Wine not found.");
  return saved;
}
