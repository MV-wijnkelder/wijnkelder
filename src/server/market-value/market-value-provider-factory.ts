import { OpenAIMarketValueProvider } from "./openai-market-value-provider.ts";

export function marketValueProvider() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAIMarketValueProvider(apiKey);
}
