import { NextResponse } from "next/server";
import { idealWineStyles, RecommendationService } from "@/server/recommendations/recommendation-service";
import type { RecommendationRequest } from "@/server/recommendations/recommendation-service";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const storage = new NeonWineStorage();
const recommendations = new RecommendationService();

export async function POST(request: Request) {
  try {
    const input = await request.json() as RecommendationRequest;
    if (typeof input.food !== "string" || !input.food.trim() || (input.occasion !== undefined && typeof input.occasion !== "string")) return NextResponse.json({ error: "Tell us what you are eating." }, { status: 400 });
    const matches = recommendations.recommend(await storage.list(), input);
    return NextResponse.json({
      recommendations: matches,
      noSuitableMatch: matches.length === 0 ? {
        message: `Your current cellar does not contain a wine I would recommend for ${input.food.trim()}.`,
        idealStyles: idealWineStyles(input.food, input.occasion),
      } : null,
    });
  } catch (error) {
    console.error("Recommendation operation failed", error);
    return NextResponse.json({ error: "Recommendations are temporarily unavailable." }, { status: 500 });
  }
}
