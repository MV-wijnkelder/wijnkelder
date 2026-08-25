import { mapRecognitionToWine } from "@/lib/wine-recognition";
import type { WineRecognition, WineRecognitionResult } from "@/lib/wine-recognition";
import type { AIProvider, RecognitionImage } from "../ai-provider";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const UNKNOWN = "Unknown";
const MINIMUM_CONFIDENCE = 60;

export type OpenAIProviderErrorCode =
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "INVALID_RESPONSE";

export class OpenAIProviderError extends Error {
  constructor(readonly code: OpenAIProviderErrorCode) {
    super(code);
    this.name = "OpenAIProviderError";
  }
}

const wineSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    recognized: { type: "boolean" },
    producer: { type: "string" },
    wineName: { type: "string" },
    vintage: { type: "string" },
    country: { type: "string" },
    region: { type: "string" },
    appellation: { type: "string" },
    grapeVarieties: { type: "array", items: { type: "string" } },
    wineColor: { type: "string" },
    bottleSize: { type: "string" },
    alcoholPercentage: { type: ["number", "null"], minimum: 0, maximum: 100 },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: [
    "recognized", "producer", "wineName", "vintage", "country", "region",
    "appellation", "grapeVarieties", "wineColor", "bottleSize",
    "alcoholPercentage", "confidence",
  ],
} as const;

export class OpenAIProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async recognizeWine(image: RecognitionImage): Promise<WineRecognitionResult> {
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
              text: `Read this wine label and identify the wine. Set recognized to false when the image is not a wine label or the wine cannot be identified reliably. Use ${UNKNOWN} for every unknown text field, an empty array when grape varieties are unknown, and null when the alcohol percentage is unknown. Express bottle size as printed on the bottle and alcoholPercentage as a number without the percent sign. Base confidence on label legibility and identification certainty. Do not guess details that are not reliably visible or inferable from the label.`,
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
      if (response.status === 401 || response.status === 403) {
        throw new OpenAIProviderError("AUTHENTICATION_FAILED");
      }
      if (response.status === 429) throw new OpenAIProviderError("RATE_LIMITED");
      throw new OpenAIProviderError("UPSTREAM_UNAVAILABLE");
    }

    return parseOutput(await response.json());
  }
}

function parseOutput(payload: unknown): WineRecognitionResult {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = response.output_text ?? response.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;

  if (!text) throw new OpenAIProviderError("INVALID_RESPONSE");

  let result: WineRecognition & { recognized: boolean };
  try {
    result = JSON.parse(text) as WineRecognition & { recognized: boolean };
  } catch {
    throw new OpenAIProviderError("INVALID_RESPONSE");
  }
  if (!result.recognized || result.confidence < MINIMUM_CONFIDENCE) {
    return { recognized: false };
  }

  return {
    recognized: true,
    wine: mapRecognitionToWine(result),
  };
}
