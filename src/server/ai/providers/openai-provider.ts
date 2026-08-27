import { mapRecognitionToWine } from "@/lib/wine-recognition";
import type { WineRecognition, WineRecognitionResult } from "@/lib/wine-recognition";
import type { AIProvider, RecognitionImage } from "../ai-provider";
import type { Wine, WineProfile } from "@/domain/wine";

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

const profileSchema = {
  type: "object", additionalProperties: false,
  properties: {
    serving: { type: "object", additionalProperties: false, properties: { temperature: { type: ["string", "null"] }, decantAdvice: { type: ["string", "null"] } }, required: ["temperature", "decantAdvice"] },
    drinking: { type: "object", additionalProperties: false, properties: { drinkFrom: { type: ["string", "null"] }, drinkUntil: { type: ["string", "null"] }, currentMaturity: { type: ["string", "null"], enum: ["young", "approaching peak", "ready", "mature", "past peak", null] } }, required: ["drinkFrom", "drinkUntil", "currentMaturity"] },
    style: { type: "object", additionalProperties: false, properties: { body: intensity(), acidity: intensity(), tannin: intensity(), sweetness: intensity(), alcohol: intensity(), wineStyle: { type: ["string", "null"] } }, required: ["body", "acidity", "tannin", "sweetness", "alcohol", "wineStyle"] },
    foodPairings: { type: "array", items: { type: "string" }, maxItems: 6 },
    sommelier: { type: "object", additionalProperties: false, properties: {
      bestOccasions: stringList(6), excellentWith: stringList(6), goodWith: stringList(6), avoidWith: stringList(5), wineStyles: stringList(6),
      ageingPotential: { type: ["string", "null"] },
      drinkingStage: { type: ["string", "null"], enum: ["Too young", "Developing", "Perfect now", "Past peak", null] },
      servingPersonality: { type: ["string", "null"] },
    }, required: ["bestOccasions", "excellentWith", "goodWith", "avoidWith", "wineStyles", "ageingPotential", "drinkingStage", "servingPersonality"] },
    summary: { type: ["string", "null"] },
    wineryInformation: { type: ["string", "null"] },
    vintageRemarks: { type: ["string", "null"] },
  },
  required: ["serving", "drinking", "style", "foodPairings", "sommelier", "summary", "wineryInformation", "vintageRemarks"],
} as const;

function intensity() { return { type: ["string", "null"], enum: ["low", "medium", "high", null] } as const; }
function stringList(maxItems: number) { return { type: "array", items: { type: "string" }, maxItems } as const; }

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
              text: `Analyse ${backImage ? "both images together" : "the front-label image"} and identify one wine. The first image is the front label: use it for producer, branding, bottle identification, and vintage. ${backImage ? "Independently check whether the second image belongs to the same wine. Compare producer, wine name, vintage, appellation, and region. If any visible values conflict, set labelsConsistent to false, list concise conflicts in labelConflicts, lower confidence by at least 40 points, and do not silently combine the conflicting value. Otherwise use the back label for grape varieties, alcohol, appellation, importer, and technical details." : "Set labelsConsistent to true and labelConflicts to an empty array."} Populate identity in this order: recognition certainty, facts visible on the labels, reliably established public facts about the exact wine, then legally canonical appellation facts (for example Barolo is red Nebbiolo and Brunello di Montalcino is red Sangiovese). Pay particular attention to wineColor and grapeVarieties. Never use a regional convention or likely blend as fact. Set recognized to false when the front image is not a wine label or cannot be identified. Use ${UNKNOWN} for every unknown text field, an empty array when grape varieties are unknown, and null when alcohol is unknown. Base confidence on legibility and certainty. Do not guess.`,
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

  async generateWineProfile(wine: Wine): Promise<WineProfile> {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: `Act as an experienced sommelier and create a complete recommendation profile for this identified wine: ${JSON.stringify({ producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage, country: wine.country, region: wine.region, appellation: wine.appellation, grapeVarieties: wine.grapeVarieties, wineColor: wine.wineColor, alcoholPercentage: wine.alcoholPercentage })}. Answer the practical question: "When would I confidently recommend opening this bottle?" Infer bestOccasions, excellentWith, goodWith, avoidWith, and concise wineStyles from the wine's structure (acidity, bubbles, body, tannin, sweetness, alcohol, development) and established typicity; do not copy website phrases. Distinguish truly excellent pairings from merely good ones. Make ageingPotential concise and vintage-aware. Choose exactly one drinkingStage. servingPersonality must be one short, natural recommendation sentence about the moment to open it, never temperature advice. Also preserve practical serving temperature and decanting advice, a vintage-aware drinking window and maturity, legacy foodPairings, and a factual summary of at most 80 words. Include winery information only when reliably known and vintage remarks only when materially useful. Use natural English. Do not invent awards, scores, tasting events, or producer claims; use null or empty arrays where evidence is insufficient.` }] }],
        text: { format: { type: "json_schema", name: "wine_profile", strict: true, schema: profileSchema } },
      }),
    });
    if (!response.ok) {
      console.error("OpenAI profile generation failed", response.status, await response.text());
      if (response.status === 401 || response.status === 403) throw new OpenAIProviderError("AUTHENTICATION_FAILED");
      if (response.status === 429) throw new OpenAIProviderError("RATE_LIMITED");
      throw new OpenAIProviderError("UPSTREAM_UNAVAILABLE");
    }
    return parseProfileOutput(await response.json());
  }
}

function outputText(payload: unknown): string | undefined {
  const response = payload as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  return response.output_text ?? response.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text;
}

function parseProfileOutput(payload: unknown): WineProfile {
  const text = outputText(payload);
  if (!text) throw new OpenAIProviderError("INVALID_RESPONSE");
  try { return JSON.parse(text) as WineProfile; } catch { throw new OpenAIProviderError("INVALID_RESPONSE"); }
}

function parseOutput(payload: unknown): WineRecognitionResult {
  const text = outputText(payload);

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
