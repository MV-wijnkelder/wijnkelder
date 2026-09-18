import type { StoredWine } from "@/domain/wine";
import type { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { marketValueProvider } from "./market-value-provider-factory.ts";
import { refreshMarketValue, shouldAutomaticallyValue } from "./market-value-service.ts";

/** Automatic retrieval is failure-safe: inventory/profile operations remain available when market research is not. */
export async function populateMarketValue(wine: StoredWine, storage: NeonWineStorage): Promise<StoredWine> {
  if (!shouldAutomaticallyValue(wine)) return wine;
  try { return await refreshMarketValue(wine, marketValueProvider(), storage); }
  catch (error) {
    const category = error instanceof Error && error.name === "AbortError" ? "timeout" : "provider";
    console.error("Automatic market value retrieval failed", { wineId: wine.id, category });
    return await storage.updateMarketValue(wine.id, null, null, {
      provider: "openai-web-search", retrievedAt: new Date().toISOString(), sourceUrls: [],
      observationCount: 0, confidence: "unavailable", failureCategory: category,
    }) ?? wine;
  }
}
