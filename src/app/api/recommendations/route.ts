import { NextResponse } from "next/server";
import { detectRecommendationIntent, idealWineStyles, RecommendationService } from "@/server/recommendations/recommendation-service";
import type { RecommendationRequest } from "@/server/recommendations/recommendation-service";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const storage = new NeonWineStorage();
const recommendations = new RecommendationService();

export async function POST(request: Request) {
  try {
    const input = await request.json() as RecommendationRequest;
    const query = input.query ?? input.food;
    if (typeof query !== "string" || !query.trim() || (input.occasion !== undefined && typeof input.occasion !== "string")) return NextResponse.json({ error: "Tell us what you would like to drink." }, { status: 400 });
    const intent = detectRecommendationIntent(query);
    const cellar = await storage.list();
    const available = cellar.filter((wine) => wine.bottleCount > 0);
    if (process.env.NODE_ENV === "development") console.debug("[recommendations] request", { intent: intent.kind, occasion: intent.kind === "recommendation" ? intent.occasion : null, cellarWinesLoaded: cellar.length, winesAfterFiltering: available.length });
    if (intent.kind === "unknown") return NextResponse.json({ recommendations: [], noSuitableMatch: null, answer: "I couldn't recognise the dish. Could you tell me what you're planning to eat tonight?" });
    if (intent.kind !== "recommendation") return NextResponse.json({ recommendations: [], noSuitableMatch: null, answer: answerCellarQuestion(available, intent) });
    const structuredInput = { ...input, query, food: intent.occasion };
    const matches = recommendations.recommend(available, structuredInput);
    return NextResponse.json({
      recommendations: matches,
      noSuitableMatch: matches.length === 0 ? {
        message: `Your current cellar does not contain a wine I would recommend for ${intent.occasion}.`,
        idealStyles: idealWineStyles(intent.occasion, input.occasion),
      } : null,
    });
  } catch (error) {
    console.error("Recommendation operation failed", error);
    return NextResponse.json({ error: "Recommendations are temporarily unavailable." }, { status: 500 });
  }
}

function answerCellarQuestion(wines: Awaited<ReturnType<NeonWineStorage["list"]>>, intent: ReturnType<typeof detectRecommendationIntent>): string {
  if (intent.kind === "ready") {
    const ready = wines.filter((wine) => ["ready", "mature"].includes(wine.profile.sommelier.drinkingStage ?? wine.profile.drinking.currentMaturity ?? ""));
    return ready.length ? `Ready to drink: ${ready.map(wineLabel).join("; ")}.` : "No wines in your cellar are explicitly marked ready to drink.";
  }
  if (intent.kind === "inventory") {
    const owned = intent.country ? wines.filter((wine) => wine.country?.toLowerCase() === intent.country?.toLowerCase()) : wines;
    return owned.length ? `${intent.country ?? "Cellar"} wines: ${owned.map(wineLabel).join("; ")}.` : `You do not currently have ${intent.country ?? "matching"} wines in your cellar.`;
  }
  if (intent.kind === "compare") {
    const matches = intent.names.map((name) => wines.find((wine) => `${wine.producer ?? ""} ${wine.wineName ?? ""}`.toLowerCase().includes(name.toLowerCase()))).filter((wine) => wine !== undefined);
    return matches.length === 2 ? matches.map((wine) => `${wineLabel(wine)} — ${wine.profile.sommelier.wineStyle ?? wine.profile.style.wineStyle ?? "style not stored"}; ${wine.profile.sommelier.drinkingStage ?? wine.profile.drinking.currentMaturity ?? "drinking stage not stored"}`).join(" Compared with ") : "I could not find both wines in your cellar to compare them.";
  }
  return "No suitable recommendation.";
}

function wineLabel(wine: Awaited<ReturnType<NeonWineStorage["list"]>>[number]): string { return [wine.producer, wine.wineName, wine.vintage].filter(Boolean).join(" "); }
