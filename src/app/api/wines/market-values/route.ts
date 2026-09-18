import { NextResponse } from "next/server";
import { marketValueProvider } from "@/server/market-value/market-value-provider-factory";
import { MARKET_VALUE_BATCH_SIZE, isMarketValueFresh, refreshMarketValueWithOutcome, selectMarketValueBatch } from "@/server/market-value/market-value-service";
import { MarketValueProviderError } from "@/server/market-value/openai-market-value-provider";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const maxDuration = 45;
const storage = new NeonWineStorage();

export async function POST(request: Request) {
  let completedIds: number[] = [];
  try {
    const body = await request.json().catch(() => ({})) as { completedIds?: unknown };
    completedIds = Array.isArray(body.completedIds) ? body.completedIds.filter((id): id is number => Number.isSafeInteger(id) && id > 0) : [];
    const completed = new Set(completedIds);
    const wines = await storage.list();
    const freshCount = wines.filter((wine) => isMarketValueFresh(wine) && !completed.has(wine.id)).length;
    const pending = selectMarketValueBatch(wines, completedIds, new Date(), Number.MAX_SAFE_INTEGER);
    const batch = pending.slice(0, MARKET_VALUE_BATCH_SIZE);
    const updatedIds: number[] = []; const retainedIds: number[] = []; const unavailableIds: number[] = []; const failedIds: number[] = [];
    for (const wine of batch) {
      try {
        const result = await refreshMarketValueWithOutcome(wine, marketValueProvider(), storage);
        if (result.outcome === "updated") updatedIds.push(wine.id);
        else if (result.outcome === "retained") retainedIds.push(wine.id);
        else unavailableIds.push(wine.id);
      }
      catch (error) {
        failedIds.push(wine.id);
        (wine.marketValue === null ? unavailableIds : retainedIds).push(wine.id);
        console.error("Market value batch item failed", { operation: "cellar-market-refresh", wineId: wine.id, category: failureCategory(error) });
      }
    }
    const checkedIds = [...new Set([...completedIds, ...updatedIds, ...retainedIds, ...unavailableIds, ...failedIds])];
    return NextResponse.json({ total: wines.length, initiallyFresh: freshCount, checkedIds, updatedIds, retainedIds, unavailableIds, failedIds, hasMore: pending.length > batch.length });
  } catch {
    console.error("Cellar market value batch failed", { operation: "cellar-market-refresh", category: "database_or_platform" });
    return NextResponse.json({ error: "Market valuation is temporarily unavailable." }, { status: 503 });
  }
}
function failureCategory(error: unknown): string { return error instanceof MarketValueProviderError ? error.category : "individual_wine"; }
