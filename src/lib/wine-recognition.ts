import { emptyCellarDetails, emptyWineProfile, emptyWineProfileMetadata } from "../domain/wine.ts";
import type { Wine } from "@/domain/wine";

/** Raw, provider-independent data returned by wine-label recognition. */
export type WineRecognition = {
  producer: string;
  wineName: string;
  vintage: string;
  country: string;
  region: string;
  appellation: string;
  grapeVarieties: string[];
  wineColor: string;
  bottleSize: string;
  alcoholPercentage: number | null;
  confidence: number;
  labelsConsistent: boolean;
  labelConflicts: string[];
};

export type WineRecognitionResult =
  | { recognized: true; wine: Wine; labelWarning?: string[] }
  | { recognized: false };

export const wineFields: Array<{
  key: Exclude<keyof Wine, "confidence" | "profile" | "profileMetadata" | "cellar">;
  label: string;
}> = [
  { key: "wineName", label: "Wine name" }, { key: "producer", label: "Producer" },
  { key: "vintage", label: "Vintage" }, { key: "country", label: "Country" },
  { key: "region", label: "Region" }, { key: "appellation", label: "Appellation" },
  { key: "grapeVarieties", label: "Grape varieties" }, { key: "wineColor", label: "Wine color" },
  { key: "bottleSize", label: "Bottle size" }, { key: "alcoholPercentage", label: "Alcohol percentage" },
];

const UNKNOWN_VALUES = new Set(["unknown", "onbekend", "n/a", "null", "-"]);

/** Converts transient AI output into the canonical wine domain model. */
export function mapRecognitionToWine(recognition: WineRecognition): Wine {
  const appellation = knownValue(recognition.appellation);
  const canonical = canonicalIdentity(appellation);
  const recognizedGrapes = recognition.grapeVarieties.map(knownValue).filter((grape): grape is string => grape !== null);
  return {
    producer: knownValue(recognition.producer),
    wineName: knownValue(recognition.wineName),
    vintage: knownValue(recognition.vintage),
    country: knownValue(recognition.country),
    region: knownValue(recognition.region),
    appellation,
    grapeVarieties: recognizedGrapes.length ? recognizedGrapes : canonical.grapes,
    wineColor: knownValue(recognition.wineColor) ?? canonical.color,
    bottleSize: knownValue(recognition.bottleSize),
    alcoholPercentage: recognition.alcoholPercentage,
    confidence: recognition.confidence,
    profile: emptyWineProfile(),
    profileMetadata: emptyWineProfileMetadata(),
    cellar: emptyCellarDetails(),
  };
}

/** Only legally fixed appellation facts belong here; broad regional conventions are not safe defaults. */
function canonicalIdentity(appellation: string | null): { grapes: string[]; color: string | null } {
  const key = appellation?.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const facts: Record<string, { grapes: string[]; color: string }> = {
    barolo: { grapes: ["Nebbiolo"], color: "Red" },
    barbaresco: { grapes: ["Nebbiolo"], color: "Red" },
    "brunello di montalcino": { grapes: ["Sangiovese"], color: "Red" },
  };
  return facts[key ?? ""] ?? { grapes: [], color: null };
}

function knownValue(value: string): string | null {
  const normalized = value.trim();
  return normalized && !UNKNOWN_VALUES.has(normalized.toLowerCase()) ? normalized : null;
}
