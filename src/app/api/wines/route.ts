import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { enrichWineProfile } from "@/server/wine-profile-enrichment";
import { wineProfileGenerator } from "@/server/wine-profile-generator";
import { marketValueProvider } from "@/server/market-value/market-value-provider-factory";
import { refreshMarketValueWithOutcome } from "@/server/market-value/market-value-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const storage = new NeonWineStorage();

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wines = await storage.list(url.searchParams.get("q") ?? url.searchParams.get("search") ?? "");
    return NextResponse.json(
      wines,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const wine = await request.json() as Wine & { bottleCount?: number };
    const result = await storage.add(wine);
    // A duplicate means this request only added bottles. Its canonical profile
    // and stored market value must be reused without another AI/web request.
    if (result.duplicate) return NextResponse.json(result, { status: 200 });
    const enriched = await enrichWineProfile(result.wine, wineProfileGenerator(), storage);
    let valued = enriched;
    try {
      valued = (await refreshMarketValueWithOutcome(enriched, marketValueProvider(), storage)).wine;
    } catch {
      // The wine and its profile are already safely stored. Valuation failures
      // are recorded by the service and must not turn a successful scan into an
      // apparent failure (or encourage the user to add the bottle twice).
      valued = await storage.get(enriched.id) ?? enriched;
    }
    return NextResponse.json({ ...result, wine: valued }, { status: 201 });
  } catch (error) { return failure(error); }
}

// Kept for clients that use PATCH /api/wines to add a bottle to a matching wine.
export async function PATCH(request: Request) {
  try {
    const wine = await request.json() as Wine;
    const result = await storage.add({ ...wine, bottleCount: 1 });
    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}

function failure(error: unknown) {
  console.error("Neon wine storage operation failed", error);
  const configuration = error instanceof Error && error.message.includes("DATABASE_URL");
  return NextResponse.json({ error: configuration ? "Database configuration is missing." : "The database operation failed." }, { status: configuration ? 503 : 500 });
}
