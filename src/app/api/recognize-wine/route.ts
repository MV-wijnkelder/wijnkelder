import { NextResponse } from "next/server";
import { AIService } from "@/server/ai/ai-service";
import { OpenAIProvider } from "@/server/ai/providers/openai-provider";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Wine recognition is not configured." }, { status: 503 });
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "Please select a valid image." }, { status: 400 });
  }
  if (image.size > MAX_IMAGE_SIZE) {
    return NextResponse.json({ error: "The image must be smaller than 10 MB." }, { status: 413 });
  }

  try {
    const aiService = new AIService(new OpenAIProvider(apiKey));
    const result = await aiService.recognizeWine({
      bytes: await image.arrayBuffer(),
      mediaType: image.type,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Wine recognition failed", error);
    return NextResponse.json({ error: "The wine could not be recognized. Please try again." }, { status: 502 });
  }
}
