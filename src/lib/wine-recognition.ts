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
};

export type WineRecognitionResult =
  | { recognized: true; wine: Wine }
  | { recognized: false };

export const wineFields: Array<{
  key: Exclude<keyof Wine, "confidence">;
  label: string;
}> = [
  { key: "wineName", label: "Wijnnaam" },
  { key: "producer", label: "Producent" },
  { key: "vintage", label: "Jaargang" },
  { key: "country", label: "Land" },
  { key: "region", label: "Regio" },
  { key: "appellation", label: "Appellatie" },
  { key: "grapeVarieties", label: "Druivenrassen" },
  { key: "wineColor", label: "Wijnkleur" },
  { key: "bottleSize", label: "Flesformaat" },
  { key: "alcoholPercentage", label: "Alcoholpercentage" },
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
