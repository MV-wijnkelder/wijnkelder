import { NextResponse } from "next/server";
import type { WineRecognition } from "@/lib/wine-recognition";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const UNKNOWN = "Unknown";

const wineSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    producer: { type: "string" },
    wine: { type: "string" },
    vintage: { type: "string" },
    country: { type: "string" },
    region: { type: "string" },
    appellation: { type: "string" },
    grapes: { type: "array", items: { type: "string" } },
    wineColour: { type: "string" },
    classification: { type: "string" },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "producer",
    "wine",
    "vintage",
    "country",
    "region",
    "appellation",
    "grapes",
    "wineColour",
    "classification",
    "confidence",
  ],
} as const;

function parseOutput(payload: unknown): WineRecognition {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = response.output_text ?? response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!text) throw new Error("OpenAI returned no recognition result.");
  return JSON.parse(text) as WineRecognition;
}

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

  const imageData = Buffer.from(await image.arrayBuffer()).toString("base64");
  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Read this wine label and identify the wine. Use ${UNKNOWN} for every unknown text field and an empty array when grapes are unknown. Base confidence on label legibility and identification certainty. Do not guess details that are not reliably visible or inferable from the label.`,
          },
          { type: "input_image", image_url: `data:${image.type};base64,${imageData}` },
        ],
      }],
      text: {
        format: {
          type: "json_schema",
          name: "wine_recognition",
          strict: true,
          schema: wineSchema,
        },
      },
    }),
  });

  if (!openAIResponse.ok) {
    console.error("OpenAI recognition failed", openAIResponse.status, await openAIResponse.text());
    return NextResponse.json({ error: "The wine could not be recognized. Please try again." }, { status: 502 });
  }

  try {
    return NextResponse.json(parseOutput(await openAIResponse.json()));
  } catch (error) {
    console.error("Invalid OpenAI recognition response", error);
    return NextResponse.json({ error: "The wine could not be recognized. Please try again." }, { status: 502 });
  }
}
