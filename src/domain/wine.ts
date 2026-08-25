/**
 * Canonical wine entity used throughout the application.
 *
 * Unknown scalar values are represented by `null`; an unknown grape blend is
 * represented by an empty array. Keep persistence concerns out of this model.
 */
export interface Wine {
  producer: string | null;
  wineName: string | null;
  vintage: string | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineColor: string | null;
  bottleSize: string | null;
  alcoholPercentage: number | null;
  confidence: number;
}
