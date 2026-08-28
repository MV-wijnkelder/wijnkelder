import { NextResponse } from "next/server";
import type { Wine } from "@/domain/wine";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { AIService } from "@/server/ai/ai-service";
import { OpenAIProvider } from "@/server/ai/providers/openai-provider";
import { enrichWineProfile } from "@/server/wine-profile-enrichment";
import { populateMarketValue } from "@/server/market-value/automatic-market-value";

export const runtime = "nodejs";
const storage = new NeonWineStorage();
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const wine = await storage.get(await id(context));
    if (!wine) return found(null);
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const generator = apiKey
      ? new AIService(new OpenAIProvider(apiKey))
      : { generateWineProfile: async () => { throw new Error("OPENAI_API_KEY is not configured"); } };
    const enriched = await enrichWineProfile(wine, generator, storage);
    return found(await populateMarketValue(enriched, storage));
  } catch (error) { return failure(error); }
}

export async function PUT(request: Request, context: Context) {
  try {
    const updated = await storage.update(await id(context), await request.json() as Wine & { bottleCount?: number });
    return found(updated ? await populateMarketValue(updated, storage) : null);
  } catch (error) { return failure(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const body = await request.json() as { change?: number; bottleCountDelta?: number };
    const change = body.change ?? body.bottleCountDelta ?? 1;
    if (!Number.isInteger(change)) return NextResponse.json({ error: "Invalid bottle count change." }, { status: 400 });
    return found(await storage.changeBottleCount(await id(context), change));
  } catch (error) { return failure(error); }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    return await storage.delete(await id(context)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Wine not found." }, { status: 404 });
  } catch (error) { return failure(error); }
}

async function id(context: Context): Promise<number> {
  const value = Number((await context.params).id);
  if (!Number.isSafeInteger(value) || value < 1) throw new InvalidIdError();
  return value;
}
function found(value: unknown | null) { return value ? NextResponse.json(value) : NextResponse.json({ error: "Wine not found." }, { status: 404 }); }
class InvalidIdError extends Error {}
function failure(error: unknown) {
  if (error instanceof InvalidIdError) return NextResponse.json({ error: "Invalid wine ID." }, { status: 400 });
  console.error("Neon wine storage operation failed", error);
  return NextResponse.json({ error: "The database operation failed." }, { status: 500 });
}
