import { AIService } from "@/server/ai/ai-service";
import { OpenAIProvider } from "@/server/ai/providers/openai-provider";

export function wineProfileGenerator() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey
    ? new AIService(new OpenAIProvider(apiKey))
    : { generateWineProfile: async () => { throw new Error("OPENAI_API_KEY is not configured"); } };
}
