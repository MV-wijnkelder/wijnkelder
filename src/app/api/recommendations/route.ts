import { NextResponse } from "next/server";
import { RecommendationService } from "@/server/recommendations/recommendation-service";
import type { RecommendationRequest } from "@/server/recommendations/recommendation-service";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const storage = new NeonWineStorage();
const recommendations = new RecommendationService();

export async function POST(request: Request) {
  try {
    const input = await request.json() as RecommendationRequest;
    if (typeof input.occasion !== "string" || typeof input.food !== "string") return NextResponse.json({ error: "Occasion and food are required." }, { status: 400 });
    return NextResponse.json({ recommendations: recommendations.recommend(await storage.list(), input) });
  } catch (error) {
    console.error("Recommendation operation failed", error);
    return NextResponse.json({ error: "Recommendations are temporarily unavailable." }, { status: 500 });
  }
}
