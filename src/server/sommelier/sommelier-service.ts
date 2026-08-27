import type { StoredWine } from "@/domain/wine";
import type { SommelierContext, SommelierMessage } from "./sommelier";

export const SOMMELIER_INTENTS = ["cellar", "buying", "restaurant", "travel", "wine_knowledge", "food_pairing", "serving", "storage", "comparison", "general"] as const;
export type SommelierIntent = typeof SOMMELIER_INTENTS[number];

export type SommelierRoute = {
  intent: SommelierIntent;
  needsCurrentWine: boolean;
  needsCellar: boolean;
  needsCurrentInformation: boolean;
};

export interface SommelierModel {
  classify(messages: SommelierMessage[]): Promise<SommelierRoute>;
  answer(input: { messages: SommelierMessage[]; instructions: string; context: string | null }): Promise<string>;
}

export interface SommelierContextSource {
  getWine(id: number): Promise<StoredWine | null>;
  listCellar(): Promise<StoredWine[]>;
}

const SPECIALIST_GUIDANCE: Record<SommelierIntent, string> = {
  cellar: "Act as a cellar advisor. Prefer suitable confirmed bottles, respect maturity and quantity, and explain the choice briefly.",
  buying: "Act as a buying advisor. Clarify budget or location only when essential. Be candid when live prices or availability are unavailable.",
  restaurant: "Act as a restaurant wine advisor. Balance the food, group, budget, and value on the list; ask for the list only when essential.",
  travel: "Act as a wine travel advisor. Give practical region and winery guidance, and distinguish stable knowledge from live travel facts.",
  wine_knowledge: "Act as a wine educator. Answer clearly in ordinary language and add detail only when it helps enjoyment.",
  food_pairing: "Act as a food-pairing advisor. Recommend flexible options and explain the key flavor or texture match.",
  serving: "Act as a serving advisor. Give practical temperature, glass, opening, and decanting advice appropriate to the wine.",
  storage: "Act as a storage advisor. Prioritize wine safety and practical storage conditions without overstating precision.",
  comparison: "Act as a comparison advisor. Compare on the dimensions that matter to the user's choice and finish with a recommendation.",
  general: "Answer as a broad wine companion and focus on the user's practical goal.",
};

export async function answerSommelier(input: {
  messages: SommelierMessage[];
  requestContext?: SommelierContext;
  baseInstructions: string;
  model: SommelierModel;
  contextSource: SommelierContextSource;
}): Promise<string> {
  const route = await input.model.classify(input.messages);
  const context = await resolveContext(route, input.requestContext, input.contextSource);
  const currentInformationNote = route.needsCurrentInformation
    ? "No live web, maps, price, or inventory tool is connected. Never fabricate current facts; state that limitation only when relevant."
    : "";
  return input.model.answer({
    messages: input.messages,
    context,
    instructions: `${input.baseInstructions}\n\n## Active specialist guidance\n${SPECIALIST_GUIDANCE[route.intent]}\n${currentInformationNote}`,
  });
}

async function resolveContext(route: SommelierRoute, context: SommelierContext | undefined, source: SommelierContextSource): Promise<string | null> {
  if (!context) return null;
  const records: { currentWine?: StoredWine; currentScannedWine?: StoredWine; cellar?: StoredWine[] } = {};
  if (route.needsCurrentWine && context.currentWineId !== undefined) records.currentWine = await source.getWine(context.currentWineId) ?? undefined;
  if (route.needsCurrentWine && context.currentScannedWineId !== undefined) records.currentScannedWine = await source.getWine(context.currentScannedWineId) ?? undefined;
  if (route.needsCellar && context.cellarEnabled) records.cellar = await source.listCellar();
  return Object.keys(records).length ? `Confirmed application context (JSON):\n${JSON.stringify(records)}` : null;
}

export function isSommelierRoute(value: unknown): value is SommelierRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<SommelierRoute>;
  return SOMMELIER_INTENTS.includes(route.intent as SommelierIntent)
    && typeof route.needsCurrentWine === "boolean"
    && typeof route.needsCellar === "boolean"
    && typeof route.needsCurrentInformation === "boolean";
}
