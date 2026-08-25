export type WineRecognition = {
  producer: string;
  wine: string;
  vintage: string;
  country: string;
  region: string;
  appellation: string;
  grapes: string[];
  wineColour: string;
  classification: string;
  confidence: number;
};

export const wineRecognitionFields: Array<{
  key: Exclude<keyof WineRecognition, "confidence">;
  label: string;
}> = [
  { key: "producer", label: "Producer" },
  { key: "wine", label: "Wine" },
  { key: "vintage", label: "Vintage" },
  { key: "country", label: "Country" },
  { key: "region", label: "Region" },
  { key: "appellation", label: "Appellation" },
  { key: "grapes", label: "Grape(s)" },
  { key: "wineColour", label: "Wine colour" },
  { key: "classification", label: "Classification" },
];
