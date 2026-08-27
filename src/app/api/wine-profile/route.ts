import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import { hasWineProfile } from "@/server/wine-profile-enrichment";
import { wineProfileGenerator } from "@/server/wine-profile-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Generate a preview profile without touching cellar storage. */
export async function POST(request: Request) {
  try {
    const wine = await request.json() as Wine;
    const profile = hasWineProfile(wine.profile)
      ? wine.profile
      : await wineProfileGenerator().generateWineProfile(wine);
    if (!hasWineProfile(profile)) throw new Error("AI returned an empty wine profile");
    return NextResponse.json({ ...wine, profile });
  } catch (error) {
    console.error("Wine profile preview failed", error);
    return NextResponse.json({ error: "The wine profile could not be created. Please try again." }, { status: 500 });
  }
}
