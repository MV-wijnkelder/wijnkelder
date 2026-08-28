import type { SommelierImageContext, SommelierMessage } from "./sommelier";
import { isSommelierRoute, SOMMELIER_ROUTING_INSTRUCTIONS, type SommelierModel, type SommelierRoute } from "./sommelier-service";

const URL = "https://api.openai.com/v1/responses";

export class OpenAISommelierModel implements SommelierModel {
  constructor(private readonly apiKey: string, private readonly model = "gpt-4.1-mini") {}

  async classify(messages: SommelierMessage[]): Promise<SommelierRoute> {
    const result = await this.request({
      model: this.model,
      instructions: SOMMELIER_ROUTING_INSTRUCTIONS,
      input: messages,
      text: { format: { type: "json_schema", name: "sommelier_route", strict: true, schema: { type: "object", additionalProperties: false, properties: { intent: { type: "string", enum: ["cellar", "buying", "restaurant", "travel", "wine_knowledge", "food_pairing", "serving", "storage", "comparison", "general"] }, needsCurrentWine: { type: "boolean" }, needsCellar: { type: "boolean" }, needsCurrentInformation: { type: "boolean" } }, required: ["intent", "needsCurrentWine", "needsCellar", "needsCurrentInformation"] } } },
    });
    const route: unknown = JSON.parse(result);
    if (!isSommelierRoute(route)) throw new Error("OpenAI returned an invalid sommelier route");
    return route;
  }

  answer(input: { messages: SommelierMessage[]; instructions: string; context: string | null; images?: SommelierImageContext[] }): Promise<string> {
    const messages: unknown[] = [...input.messages];
    if (input.images?.length) {
      const latest = input.messages.at(-1)!;
      messages[messages.length - 1] = { role: "user", content: [
        { type: "input_text", text: latest.content },
        ...input.images.map((image) => ({ type: "input_image", image_url: `data:${image.mediaType};base64,${Buffer.from(image.bytes).toString("base64")}` })),
      ] };
    }
    return this.request({ model: this.model, instructions: input.instructions, input: input.context ? [{ role: "developer", content: input.context }, ...messages] : messages });
  }

  private async request(body: object): Promise<string> {
    const response = await fetch(URL, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
    const result = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const text = result.output_text ?? result.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("OpenAI returned no text");
    return text;
  }
}
