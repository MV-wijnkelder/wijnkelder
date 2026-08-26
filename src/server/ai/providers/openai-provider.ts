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
    labelsConsistent: { type: "boolean" },
    labelConflicts: { type: "array", items: { type: "string" } },
  },
  required: [
    "recognized", "producer", "wineName", "vintage", "country", "region",
    "appellation", "grapeVarieties", "wineColor", "bottleSize",
    "alcoholPercentage", "confidence", "labelsConsistent", "labelConflicts",
  ],
} as const;

export class OpenAIProvider implements AIProvider {
  constructor(private readonly apiKey: string) {}

  async recognizeWine(frontImage: RecognitionImage, backImage?: RecognitionImage): Promise<WineRecognitionResult> {
    const imageContent = (image: RecognitionImage) => ({
      type: "input_image",
      image_url: `data:${image.mediaType};base64,${Buffer.from(image.bytes).toString("base64")}`,
    });
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
              text: `Analyse ${backImage ? "both images together" : "the front-label image"} and identify one wine. The first image is the front label: use it for producer, branding, bottle identification, and vintage. ${backImage ? "Independently check whether the second image belongs to the same wine. Compare producer, wine name, vintage, appellation, and region. If any visible values conflict, set labelsConsistent to false, list concise conflicts in labelConflicts, lower confidence by at least 40 points, and do not silently combine the conflicting value. Otherwise use the back label for grape varieties, alcohol, appellation, importer, and technical details." : "Set labelsConsistent to true and labelConflicts to an empty array."} Set recognized to false when the front image is not a wine label or cannot be identified. Use ${UNKNOWN} for every unknown text field, an empty array when grape varieties are unknown, and null when alcohol is unknown. Base confidence on legibility and certainty. Do not guess.`,
            },
            imageContent(frontImage),
            ...(backImage ? [imageContent(backImage)] : []),
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
  if (!result.recognized || (result.labelsConsistent && result.confidence < MINIMUM_CONFIDENCE)) {
    return { recognized: false };
  }

  return {
    recognized: true,
    wine: mapRecognitionToWine(result),
    ...(!result.labelsConsistent && result.labelConflicts.length
      ? { labelWarning: result.labelConflicts }
      : {}),
  };
}
