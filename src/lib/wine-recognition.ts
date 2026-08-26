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
  key: Exclude<keyof Wine, "confidence">;
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
  return {
    producer: knownValue(recognition.producer),
    wineName: knownValue(recognition.wineName),
    vintage: knownValue(recognition.vintage),
    country: knownValue(recognition.country),
    region: knownValue(recognition.region),
    appellation: knownValue(recognition.appellation),
    grapeVarieties: recognition.grapeVarieties
      .map(knownValue)
      .filter((grape): grape is string => grape !== null),
    wineColor: knownValue(recognition.wineColor),
    bottleSize: knownValue(recognition.bottleSize),
    alcoholPercentage: recognition.alcoholPercentage,
    confidence: recognition.confidence,
  };
}

function knownValue(value: string): string | null {
  const normalized = value.trim();
  return normalized && !UNKNOWN_VALUES.has(normalized.toLowerCase()) ? normalized : null;
}
