import type { StoredWine } from "@/domain/wine";
import type { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { marketValueProvider } from "./market-value-provider-factory.ts";
import { refreshMarketValue, shouldAutomaticallyValue } from "./market-value-service.ts";
import { MarketValueProviderError } from "./openai-market-value-provider.ts";

/** Automatic retrieval is failure-safe: inventory/profile operations remain available when market research is not. */
export async function populateMarketValue(wine: StoredWine, storage: NeonWineStorage): Promise<StoredWine> {
  if (!shouldAutomaticallyValue(wine)) return wine;
  try { return await refreshMarketValue(wine, marketValueProvider(), storage); }
  catch (error) {
    const category = error instanceof MarketValueProviderError ? error.category : "provider";
    console.error("Automatic market value retrieval failed", { wineId: wine.id, category });
    // refreshMarketValue has already recorded the failed attempt transactionally.
    return await storage.get(wine.id).catch(() => null) ?? wine;
  }
}
