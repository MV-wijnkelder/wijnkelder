import { NextResponse } from "next/server";
import type { SommelierImageContext, SommelierRequest } from "@/server/sommelier/sommelier";
import { isValidSommelierMessage, MAX_SOMMELIER_IMAGES, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "@/server/sommelier/sommelier";
import { answerSommelier } from "@/server/sommelier/sommelier-service";
import { OpenAISommelierModel } from "@/server/sommelier/openai-sommelier-model";
import { OpenAILiveIntelligenceSkill } from "@/server/sommelier/live-intelligence-skill";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const { body, images } = await readRequest(request);
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_SOMMELIER_MESSAGES || !body.messages.every(isValidSommelierMessage) || body.messages.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "Please enter a wine question." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const storage = new NeonWineStorage();
    const reply = await answerSommelier({ messages: body.messages, requestContext: body.context, images, baseInstructions: SOMMELIER_INSTRUCTIONS, model: new OpenAISommelierModel(apiKey), liveIntelligence: new OpenAILiveIntelligenceSkill(apiKey), contextSource: { getWine: (id) => storage.get(id), listCellar: () => storage.list() } });
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Sommelier conversation failed", error);
    return NextResponse.json({ error: "Your sommelier is temporarily unavailable. Please try again." }, { status: 500 });
  }
}

async function readRequest(request: Request): Promise<{ body: SommelierRequest; images: SommelierImageContext[] }> {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) return { body: await request.json() as SommelierRequest, images: [] };
  const form = await request.formData();
  const rawMessages = form.get("messages");
  if (typeof rawMessages !== "string") throw new Error("Messages are missing");
  const files = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > MAX_SOMMELIER_IMAGES || files.some((file) => !IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES)) throw new Error("Unsupported image upload");
  return {
    body: { messages: JSON.parse(rawMessages) as SommelierRequest["messages"], context: { cellarEnabled: true } },
    images: await Promise.all(files.map(async (file) => ({ mediaType: file.type as SommelierImageContext["mediaType"], bytes: new Uint8Array(await file.arrayBuffer()) }))),
  };
}
