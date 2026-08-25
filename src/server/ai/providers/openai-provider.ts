import type { WineRecognition } from "@/lib/wine-recognition";
import type { AIProvider, RecognitionImage } from "../ai-provider";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
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
    "producer", "wine", "vintage", "country", "region", "appellation",
    "grapes", "wineColour", "classification", "confidence",
  ],
} as const;

export class OpenAIProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async recognizeWine(image: RecognitionImage): Promise<WineRecognition> {
    const imageData = Buffer.from(image.bytes).toString("base64");
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
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
            {
              type: "input_image",
              image_url: `data:${image.mediaType};base64,${imageData}`,
            },
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

    if (!response.ok) {
      console.error("OpenAI recognition failed", response.status, await response.text());
      throw new Error("AI_PROVIDER_ERROR");
    }

    return parseOutput(await response.json());
  }
}

function parseOutput(payload: unknown): WineRecognition {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = response.output_text ?? response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!text) throw new Error("AI_PROVIDER_INVALID_RESPONSE");
  return JSON.parse(text) as WineRecognition;
}
