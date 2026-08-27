import type { SommelierMessage } from "./sommelier";
import type { LiveIntelligenceResult, LiveIntelligenceSkill } from "./sommelier-service";

const URL = "https://api.openai.com/v1/responses";

/** Uses web search only after the sommelier has determined that facts must be current. */
export class OpenAILiveIntelligenceSkill implements LiveIntelligenceSkill {
  constructor(private readonly apiKey: string, private readonly model = "gpt-4.1-mini") {}

  async research(messages: SommelierMessage[]): Promise<LiveIntelligenceResult> {
    const response = await fetch(URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        instructions: "Research the latest user request using current web information. Focus only on wine-relevant prices, availability, businesses, opening hours, reservations, routes, distances, events, promotions, recent news, or critic scores needed to answer it. Consider earlier conversation context. Return concise verified facts with source links and note conflicts or missing facts. Do not discuss tools or internal routing.",
        input: messages,
        tools: [{ type: "web_search_preview" }],
      }),
    });
    if (!response.ok) throw new Error(`Live Intelligence request failed with status ${response.status}`);
    const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const content = result.output_text ?? result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!content) throw new Error("Live Intelligence returned no text");
    return { status: "available", content };
  }
}
