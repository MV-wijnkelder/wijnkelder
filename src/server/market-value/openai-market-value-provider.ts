import type { Wine } from "@/domain/wine";
import type { MarketPriceObservation, MarketValueProvider } from "./market-value-provider.ts";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

const schema = {
  type: "object",
  properties: {
    observations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          price: { type: "number", exclusiveMinimum: 0 },
          currency: { type: "string", enum: ["EUR"] },
          sourceUrl: { type: "string" },
        },
        required: ["price", "currency", "sourceUrl"],
        additionalProperties: false,
      },
    },
  },
  required: ["observations"],
  additionalProperties: false,
} as const;

/** Uses OpenAI web search only as a retrieval adapter; VinoCastello calculates the value deterministically. */
export class OpenAIMarketValueProvider implements MarketValueProvider {
  readonly name = "openai-web-search";
  constructor(private readonly apiKey: string) {}

  async findPrices(wine: Wine): Promise<MarketPriceObservation[]> {
    const identity = {
      producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage,
      bottleSize: wine.bottleSize, appellation: wine.appellation,
      region: wine.region, country: wine.country,
    };
    const response = await fetch(RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        tools: [{ type: "web_search_preview", search_context_size: "medium" }],
        input: `Find current public EUR bottle offers for exactly this wine: ${JSON.stringify(identity)}. Match producer, wine name, vintage, bottle size, appellation, region, and country wherever supplied. Use only an official winery, recognised wine merchant, reputable online retailer, or recognised wine-market aggregator. Exclude auctions, user listings, unavailable historical pages, cases, mixed lots, restaurant lists, and a different vintage or bottle size. Convert no currencies. Return only independently verifiable exact-match offers with the direct public HTTPS product URL. If the identity or reliable offers are insufficient, return an empty observations array.`,
        text: { format: { type: "json_schema", name: "market_prices", strict: true, schema } },
      }),
    });
    if (!response.ok) throw new Error(`Market data provider returned ${response.status}.`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Market data provider returned an invalid response.");
    const parsed = JSON.parse(text) as { observations?: MarketPriceObservation[] };
    return Array.isArray(parsed.observations) ? parsed.observations : [];
  }
}
