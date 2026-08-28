import { NextResponse } from "next/server";
import { marketValueProvider } from "@/server/market-value/market-value-provider-factory";
import { refreshMarketValue } from "@/server/market-value/market-value-service";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
const storage = new NeonWineStorage();

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Invalid wine ID." }, { status: 400 });
  try {
    const wine = await storage.get(id);
    if (!wine) return NextResponse.json({ error: "Wine not found." }, { status: 404 });
    return NextResponse.json(await refreshMarketValue(wine, marketValueProvider(), storage));
  } catch (error) {
    console.error("Market value refresh failed", { wineId: id, error });
    return NextResponse.json({ error: "The Estimated Market Value could not be refreshed. Please try again." }, { status: 503 });
  }
}
