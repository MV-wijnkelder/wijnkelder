export type WineRecognition = {
  producer: string;
  wineName: string;
  vintage: string;
  country: string;
  region: string;
  grapes: string[];
  confidence: number;
};

export type WineRecognitionResult =
  | { recognized: true; wine: WineRecognition }
  | { recognized: false };

export const wineRecognitionFields: Array<{
  key: Exclude<keyof WineRecognition, "confidence">;
  label: string;
}> = [
  { key: "wineName", label: "Wijnnaam" },
  { key: "producer", label: "Producent" },
  { key: "vintage", label: "Jaargang" },
  { key: "country", label: "Land" },
  { key: "region", label: "Regio" },
  { key: "grapes", label: "Druif/druiven" },
];
