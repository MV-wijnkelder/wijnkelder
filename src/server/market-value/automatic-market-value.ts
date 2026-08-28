import type { StoredWine } from "@/domain/wine";
import type { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { marketValueProvider } from "./market-value-provider-factory.ts";
import { refreshMarketValue } from "./market-value-service.ts";

/** Automatic retrieval is failure-safe: inventory/profile operations remain available when market research is not. */
export async function populateMarketValue(wine: StoredWine, storage: NeonWineStorage): Promise<StoredWine> {
  if (wine.marketValueMetadata.retrievedAt) return wine;
  try { return await refreshMarketValue(wine, marketValueProvider(), storage); }
  catch (error) {
    console.error("Automatic market value retrieval failed", { wineId: wine.id, error });
    return wine;
  }
}
