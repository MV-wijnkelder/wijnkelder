import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SommelierRole = "user" | "assistant";

export type SommelierMessage = {
  role: SommelierRole;
  content: string;
};

/** Reserved context slots keep future integrations additive and explicit. */
export type SommelierContext = {
  currentWineId?: number;
  currentScannedWineId?: number;
  currentRecommendationId?: string;
  cellarEnabled?: boolean;
  restaurantWineListId?: string;
  shoppingMode?: boolean;
};

/** A transport-neutral placeholder for future image understanding integrations. */
export type SommelierImageContext = {
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

export type SommelierRequest = {
  messages: SommelierMessage[];
  context?: SommelierContext;
};

export const MAX_SOMMELIER_IMAGES = 6;

export const MAX_SOMMELIER_MESSAGES = 30;

export function isValidSommelierMessage(value: unknown): value is SommelierMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<SommelierMessage>;
  return (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim().length > 0 && message.content.length <= 4_000;
}

/** The documented prompt is also the runtime source, so guidance cannot drift. */
export const SOMMELIER_INSTRUCTIONS = readFileSync(join(process.cwd(), "docs", "SommelierPrompt.md"), "utf8");
