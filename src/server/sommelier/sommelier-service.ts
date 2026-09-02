import type { StoredWine } from "@/domain/wine";
import type { SommelierContext, SommelierImageContext, SommelierMessage } from "./sommelier";
import { getDrinkingLifecycle } from "../../lib/drinking-lifecycle.ts";

export const SOMMELIER_INTENTS = ["cellar", "buying", "restaurant", "travel", "wine_knowledge", "food_pairing", "serving", "storage", "comparison", "general"] as const;
export type SommelierIntent = typeof SOMMELIER_INTENTS[number];

export const SOMMELIER_ROUTING_INSTRUCTIONS = `Classify the latest user request in its conversation. Return JSON only with intent (cellar, buying, restaurant, travel, wine_knowledge, food_pairing, serving, storage, comparison, or general), needsCurrentWine, needsCellar, and needsCurrentInformation booleans.
Set needsCurrentInformation true for current prices, cheapest buying locations, availability, restaurant or wine-bar recommendations, opening hours, reservations, distances, routes, events, festivals, promotions, recent winery news, and current critic scores. Set it false for stable wine knowledge and serving advice. Use the cellar without live information for questions about bottles the user owns. For buying decisions, set both needsCellar and needsCurrentInformation true when personal inventory could affect the recommendation. Do not answer the user.`;

export type SommelierRoute = {
  intent: SommelierIntent;
  needsCurrentWine: boolean;
  needsCellar: boolean;
  needsCurrentInformation: boolean;
};

export interface SommelierModel {
  classify(messages: SommelierMessage[]): Promise<SommelierRoute>;
  answer(input: { messages: SommelierMessage[]; instructions: string; context: string | null; images?: SommelierImageContext[] }): Promise<string>;
}

export interface SommelierContextSource {
  getWine(id: number): Promise<StoredWine | null>;
  listCellar(): Promise<StoredWine[]>;
}

export type LiveIntelligenceResult =
  | { status: "available"; content: string }
  | { status: "unavailable" };

/** Specialist boundary for current web, business, market, and travel facts. */
export interface LiveIntelligenceSkill {
  research(messages: SommelierMessage[]): Promise<LiveIntelligenceResult>;
}

const SPECIALIST_GUIDANCE: Record<SommelierIntent, string> = {
  cellar: "Act as a cellar advisor. Prefer the suitable bottle that should be opened now, not merely one that can be. Protect a materially developing bottle when an equally suitable peak or near-peak alternative exists; quantity is secondary. Explain that trade-off briefly and naturally.",
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
  liveIntelligence?: LiveIntelligenceSkill;
  images?: SommelierImageContext[];
}): Promise<string> {
  const route = await input.model.classify(input.messages);
  const applicationContext = await resolveContext(route, input.requestContext, input.contextSource);
  const liveResult = route.needsCurrentInformation
    ? await getLiveIntelligence(input.liveIntelligence, input.messages)
    : null;
  const context = combineContext(applicationContext, liveResult);
  const currentInformationNote = liveResult?.status === "available"
    ? "Use the supplied Live Intelligence for time-sensitive claims. Preserve useful source links, mention material uncertainty, and never expose routing or tool details."
    : liveResult?.status === "unavailable"
      ? "Current information could not be obtained. Say so honestly, do not fabricate current facts, and then give the best useful advice available."
      : "";
  return input.model.answer({
    messages: input.messages,
    context,
    images: input.images,
    instructions: `${input.baseInstructions}\n\n## Active specialist guidance\n${SPECIALIST_GUIDANCE[route.intent]}\n${currentInformationNote}`,
  });
}

async function getLiveIntelligence(skill: LiveIntelligenceSkill | undefined, messages: SommelierMessage[]): Promise<LiveIntelligenceResult> {
  if (!skill) return { status: "unavailable" };
  try {
    return await skill.research(messages);
  } catch (error) {
    console.error("Live Intelligence failed", error);
    return { status: "unavailable" };
  }
}

function combineContext(applicationContext: string | null, liveResult: LiveIntelligenceResult | null): string | null {
  const sections = [applicationContext];
  if (liveResult?.status === "available") sections.push(`Current Live Intelligence:\n${liveResult.content}`);
  return sections.filter((section): section is string => Boolean(section)).join("\n\n") || null;
}

async function resolveContext(route: SommelierRoute, context: SommelierContext | undefined, source: SommelierContextSource): Promise<string | null> {
  const records: { currentWine?: StoredWine; currentScannedWine?: StoredWine; cellar?: StoredWine[] } = {};
  if (route.needsCurrentWine && context?.currentWineId !== undefined) records.currentWine = await source.getWine(context.currentWineId) ?? undefined;
  if (route.needsCurrentWine && context?.currentScannedWineId !== undefined) records.currentScannedWine = await source.getWine(context.currentScannedWineId) ?? undefined;
  // The cellar is intrinsic personal context, not an opt-in attachment. Routing
  // controls when its potentially large payload is sent to the model.
  if (route.needsCellar) records.cellar = await source.listCellar();
  const withLifecycle = (wine: StoredWine) => ({ ...wine, drinkingLifecycle: getDrinkingLifecycle(wine) });
  const modelRecords = {
    ...(records.currentWine ? { currentWine: withLifecycle(records.currentWine) } : {}),
    ...(records.currentScannedWine ? { currentScannedWine: withLifecycle(records.currentScannedWine) } : {}),
    ...(records.cellar ? { cellar: records.cellar.map(withLifecycle) } : {}),
  };
  return Object.keys(modelRecords).length ? `Confirmed application context (JSON):\n${JSON.stringify(modelRecords)}` : null;
}

export function isSommelierRoute(value: unknown): value is SommelierRoute {
  if (!value || typeof value !== "object") return false;
  const route = value as Partial<SommelierRoute>;
  return SOMMELIER_INTENTS.includes(route.intent as SommelierIntent)
    && typeof route.needsCurrentWine === "boolean"
    && typeof route.needsCellar === "boolean"
    && typeof route.needsCurrentInformation === "boolean";
}
