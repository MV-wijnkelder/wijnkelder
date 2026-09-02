import { mapRecognitionToWine } from "@/lib/wine-recognition";
import type { WineRecognition, WineRecognitionResult } from "@/lib/wine-recognition";
import type { AIProvider, RecognitionImage } from "../ai-provider";
import type { Wine, WineEnrichment } from "@/domain/wine";

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
    sommelier: { type: "object", additionalProperties: false, properties: {
      occasions: { type: "array", items: { type: "string" }, maxItems: 8 },
      pairings: { type: "object", additionalProperties: false, properties: {
        excellent: { type: "array", items: { type: "string" }, maxItems: 8 },
        good: { type: "array", items: { type: "string" }, maxItems: 8 },
        avoid: { type: "array", items: { type: "string" }, maxItems: 8 },
      }, required: ["excellent", "good", "avoid"] },
      wineStyle: { type: ["string", "null"] }, ageingPotential: { type: ["string", "null"] },
      drinkingStage: { type: ["string", "null"], enum: ["young", "approaching peak", "ready", "mature", "past peak", null] },
      servingPersonality: { type: ["string", "null"] },
    }, required: ["occasions", "pairings", "wineStyle", "ageingPotential", "drinkingStage", "servingPersonality"] },
    tasting: { type: "object", additionalProperties: false, properties: {
      appearance: { type: ["string", "null"] },
      aromas: { type: "array", items: { type: "string" }, maxItems: 6 },
      flavors: { type: "array", items: { type: "string" }, maxItems: 6 },
      finish: { type: ["string", "null"] },
    }, required: ["appearance", "aromas", "flavors", "finish"] },
    serving: { type: "object", additionalProperties: false, properties: { temperature: { type: ["string", "null"] }, decantAdvice: { type: ["string", "null"] } }, required: ["temperature", "decantAdvice"] },
    drinking: { type: "object", additionalProperties: false, properties: { drinkFrom: { type: ["string", "null"] }, peakFrom: { type: ["string", "null"] }, peakUntil: { type: ["string", "null"] }, drinkUntil: { type: ["string", "null"] }, currentMaturity: { type: ["string", "null"], enum: ["young", "approaching peak", "ready", "mature", "past peak", null] } }, required: ["drinkFrom", "peakFrom", "peakUntil", "drinkUntil", "currentMaturity"] },
    style: { type: "object", additionalProperties: false, properties: { body: intensity(), acidity: intensity(), tannin: intensity(), sweetness: intensity(), alcohol: intensity(), wineStyle: { type: ["string", "null"] } }, required: ["body", "acidity", "tannin", "sweetness", "alcohol", "wineStyle"] },
    foodPairings: { type: "array", items: { type: "string" }, maxItems: 6 },
    summary: { type: ["string", "null"] },
    wineryInformation: { type: ["string", "null"] },
    vintageRemarks: { type: ["string", "null"] },
  },
  required: ["sommelier", "tasting", "serving", "drinking", "style", "foodPairings", "summary", "wineryInformation", "vintageRemarks"],
} as const;

const enrichmentSchema = {
  type: "object", additionalProperties: false,
  properties: {
    profile: profileSchema,
  },
  required: ["profile"],
} as const;

function intensity() { return { type: ["string", "null"], enum: ["low", "medium", "high", null] } as const; }

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

  async generateWineProfile(wine: Wine): Promise<WineEnrichment> {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [{ role: "user", content: [{ type: "input_text", text: `Create a concise, useful sommelier profile for this identified wine: ${JSON.stringify({ producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage, country: wine.country, region: wine.region, appellation: wine.appellation, grapeVarieties: wine.grapeVarieties, wineColor: wine.wineColor, alcoholPercentage: wine.alcoholPercentage })}. Provide structured recommendation facts: occasions, excellent/good/avoid pairings, wine style, explicit ageing potential, drinking stage, and serving personality. Firmina must include Aperitif as an occasion and Fresh as its wine style. Also provide a structured sensory profile with a brief appearance, up to six specific aromas, up to six specific flavors, and a brief finish. Give distinct vintage-aware Drink From, Peak From, Peak Until, and Drink Until years: Drink From is earliest good drinking, the peak fields are the best period, and Drink Until is the approximate end of optimal life. Determine these from the exact producer, cuvée and vintage when reliably known, then appellation/vintage, grapes/region/style, and only then generic assumptions. Do not collapse earliest drinkability into peak. Use practical serving temperature and decanting advice, maturity, style levels, specific food pairings, and a factual summary of at most 80 words. Include concise winery information only when reliably known and vintage remarks only when that vintage materially affects the advice. Use null or an empty array whenever a detail is not reliably known. Do not invent awards, scores, tasting events, or producer claims.` }] }],
        text: { format: { type: "json_schema", name: "wine_enrichment", strict: true, schema: enrichmentSchema } },
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

function parseProfileOutput(payload: unknown): WineEnrichment {
  const text = outputText(payload);
  if (!text) throw new OpenAIProviderError("INVALID_RESPONSE");
  try { return JSON.parse(text) as WineEnrichment; } catch { throw new OpenAIProviderError("INVALID_RESPONSE"); }
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
