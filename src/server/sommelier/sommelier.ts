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
export type SommelierImageSet = {
  id: string;
  /** Zero-based index of the user message that introduced this set. */
  messageIndex: number;
  label: string;
  images: Array<{ name: string; dataUrl: string }>;
};

export type SommelierRequest = {
  messages: SommelierMessage[];
  context?: SommelierContext;
  imageSets?: SommelierImageSet[];
};

const IMAGE_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
export function isValidSommelierImageSet(value: unknown, messageCount: number): value is SommelierImageSet {
  if (!value || typeof value !== "object") return false;
  const set = value as Partial<SommelierImageSet>;
  return typeof set.id === "string" && set.id.length > 0 && set.id.length <= 100
    && Number.isInteger(set.messageIndex) && set.messageIndex! >= 0 && set.messageIndex! < messageCount
    && typeof set.label === "string" && set.label.trim().length > 0 && set.label.length <= 120
    && Array.isArray(set.images) && set.images.length > 0 && set.images.length <= 4
    && set.images.every((image) => typeof image?.name === "string" && image.name.length <= 150
      && typeof image?.dataUrl === "string" && image.dataUrl.length <= 4_000_000 && IMAGE_DATA_URL.test(image.dataUrl));
}

export const MAX_SOMMELIER_MESSAGES = 30;

export function isValidSommelierMessage(value: unknown): value is SommelierMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<SommelierMessage>;
  return (message.role === "user" || message.role === "assistant") && typeof message.content === "string" && message.content.trim().length > 0 && message.content.length <= 4_000;
}

/** The documented prompt is also the runtime source, so guidance cannot drift. */
export const SOMMELIER_INSTRUCTIONS = readFileSync(join(process.cwd(), "docs", "SommelierPrompt.md"), "utf8");
