import { NextResponse } from "next/server";
import type { SommelierRequest } from "@/server/sommelier/sommelier";
import { isValidSommelierMessage, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "@/server/sommelier/sommelier";
import { answerSommelier } from "@/server/sommelier/sommelier-service";
import { OpenAISommelierModel } from "@/server/sommelier/openai-sommelier-model";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as SommelierRequest;
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_SOMMELIER_MESSAGES || !body.messages.every(isValidSommelierMessage) || body.messages.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "Please enter a wine question." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const storage = new NeonWineStorage();
    const reply = await answerSommelier({ messages: body.messages, requestContext: body.context, baseInstructions: SOMMELIER_INSTRUCTIONS, model: new OpenAISommelierModel(apiKey), contextSource: { getWine: (id) => storage.get(id), listCellar: () => storage.list() } });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Sommelier conversation failed", error);
    return NextResponse.json({ error: "Your sommelier is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
