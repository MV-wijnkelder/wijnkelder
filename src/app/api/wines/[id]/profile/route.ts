import { NextResponse } from "next/server";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { refreshWineProfile } from "@/server/wine-profile-enrichment";
import { wineProfileGenerator } from "@/server/wine-profile-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const storage = new NeonWineStorage();

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const value = Number((await context.params).id);
  if (!Number.isSafeInteger(value) || value < 1) return NextResponse.json({ error: "Invalid wine ID." }, { status: 400 });
  try {
    const wine = await storage.get(value);
    if (!wine) return NextResponse.json({ error: "Wine not found." }, { status: 404 });
    return NextResponse.json(await refreshWineProfile(wine, wineProfileGenerator(), storage));
  } catch (error) {
    console.error("Wine profile refresh failed", { wineId: value, error });
    return NextResponse.json({ error: "The wine profile could not be refreshed. Please try again." }, { status: 500 });
  }
}
