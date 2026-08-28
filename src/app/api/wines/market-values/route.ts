import { NextResponse } from "next/server";
import { marketValueProvider } from "@/server/market-value/market-value-provider-factory";
import { refreshMarketValue } from "@/server/market-value/market-value-service";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
const storage = new NeonWineStorage();

export async function POST() {
  try {
    const provider = marketValueProvider();
    const wines = await storage.list();
    for (const wine of wines) {
      try { await refreshMarketValue(wine, provider, storage); }
      catch (error) { console.error("Wine market value refresh failed during cellar refresh", { wineId: wine.id, error }); }
    }
    return NextResponse.json(await storage.list());
  } catch (error) {
    console.error("Cellar market value refresh failed", error);
    return NextResponse.json({ error: "The cellar's Estimated Market Values could not all be refreshed. Please try again." }, { status: 503 });
  }
}
