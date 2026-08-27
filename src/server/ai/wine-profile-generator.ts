import type { Wine, WineProfile } from "@/domain/wine";

const endpoint = "https://api.openai.com/v1/responses";

const nullableString = { type: ["string", "null"] } as const;
const intensity = { type: ["string", "null"], enum: ["low", "medium", "high", null] } as const;
const schema = {
  type: "object", additionalProperties: false,
  properties: {
    serving: { type: "object", additionalProperties: false, properties: { temperature: nullableString, decantAdvice: nullableString }, required: ["temperature", "decantAdvice"] },
    drinking: { type: "object", additionalProperties: false, properties: { drinkFrom: nullableString, drinkUntil: nullableString, currentMaturity: { type: ["string", "null"], enum: ["young", "approaching peak", "ready", "mature", "past peak", null] } }, required: ["drinkFrom", "drinkUntil", "currentMaturity"] },
    style: { type: "object", additionalProperties: false, properties: { body: intensity, acidity: intensity, tannin: intensity, sweetness: intensity, alcohol: intensity, wineStyle: nullableString }, required: ["body", "acidity", "tannin", "sweetness", "alcohol", "wineStyle"] },
    foodPairings: { type: "array", items: { type: "string" }, maxItems: 6 }, summary: nullableString,
  }, required: ["serving", "drinking", "style", "foodPairings", "summary"],
} as const;

export function hasWineProfile(profile: WineProfile): boolean {
  return Boolean(profile.summary || profile.foodPairings.length || profile.serving.temperature || profile.serving.decantAdvice || profile.drinking.currentMaturity || profile.style.wineStyle);
}

/** Enriches one known cellar wine; it never searches or recommends other wines. */
export async function generateWineProfile(wine: Wine, apiKey: string): Promise<WineProfile> {
  const identity = { producer: wine.producer, wineName: wine.wineName, vintage: wine.vintage, country: wine.country, region: wine.region, appellation: wine.appellation, grapeVarieties: wine.grapeVarieties, wineColor: wine.wineColor, alcoholPercentage: wine.alcoholPercentage };
  const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({
    model: "gpt-4.1-mini",
    input: [{ role: "user", content: [{ type: "input_text", text: `Create a concise wine profile for this exact wine: ${JSON.stringify(identity)}. Use null rather than inventing facts you cannot reasonably determine. Summary must be at most 80 words. Give practical serving, drinking and food guidance. English only.` }] }],
    text: { format: { type: "json_schema", name: "wine_profile", strict: true, schema } },
  }) });
  if (!response.ok) throw new Error(`Profile provider returned ${response.status}`);
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("Profile provider returned no profile");
  return JSON.parse(text) as WineProfile;
}
