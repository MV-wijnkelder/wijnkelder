import { NextResponse } from "next/server";
import type { SommelierRequest } from "@/server/sommelier/sommelier";
import { isValidSommelierMessage, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "@/server/sommelier/sommelier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
export async function POST(request: Request) {
  try {
    const body = await request.json() as SommelierRequest;
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_SOMMELIER_MESSAGES || !body.messages.every(isValidSommelierMessage) || body.messages.at(-1)?.role !== "user") {
      return NextResponse.json({ error: "Please enter a wine question." }, { status: 400 });
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4.1-mini", instructions: SOMMELIER_INSTRUCTIONS, input: body.messages }),
    });
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
    const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const reply = result.output_text ?? result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!reply) throw new Error("OpenAI returned no text");
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Sommelier conversation failed", error);
    return NextResponse.json({ error: "Your sommelier is temporarily unavailable. Please try again." }, { status: 500 });
  }
}
