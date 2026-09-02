import type { StoredWine, Wine } from "@/domain/wine";

export type DrinkingStage = "wellBeyondPeak" | "beyondPeak" | "pastPeak" | "young" | "ready" | "excellent" | "nearPeak" | "peak";
export type DrinkingOutlook = "pastPeak" | "drinkNow" | "nextTwoYears" | "threeToFiveYears" | "longTerm";

export type DrinkingLifecycle = {
  drinkFrom: number;
  peakFrom: number;
  peakUntil: number;
  drinkBy: number;
  stage: DrinkingStage;
  readinessPosition: number;
  outlook: DrinkingOutlook;
  yearsUntilPeak: number;
  materialAgeingUpside: boolean;
  preservationScore: number;
};

/**
 * Canonical interpretation used by insights, filters, recommendations and AI context.
 * Older profiles remain useful: when explicit peak dates are absent, the best period
 * is conservatively inferred inside (not at the start of) the stored drinking window.
 */
export function getDrinkingLifecycle(wine: Wine | StoredWine, currentYear = new Date().getUTCFullYear()): DrinkingLifecycle | null {
  const drinking = wine.profile?.drinking;
  if (!drinking) return null;
  const drinkFrom = yearOf(drinking.drinkFrom);
  const drinkBy = yearOf(drinking.drinkUntil);
  if (drinkFrom === null || drinkBy === null || drinkBy < drinkFrom) return null;

  const span = drinkBy - drinkFrom;
  const suppliedPeakFrom = yearOf(drinking.peakFrom);
  const suppliedPeakUntil = yearOf(drinking.peakUntil);
  const inferredPeakFrom = drinkFrom + Math.max(1, Math.round(span * .45));
  const peakFrom = clamp(suppliedPeakFrom ?? inferredPeakFrom, drinkFrom, drinkBy);
  const inferredPeakUntil = peakFrom + Math.max(0, Math.round((drinkBy - peakFrom) * .45));
  const peakUntil = clamp(suppliedPeakUntil ?? inferredPeakUntil, peakFrom, drinkBy);
  const yearsUntilPeak = peakFrom - currentYear;

  let stage: DrinkingStage;
  if (currentYear > drinkBy) {
    const past = currentYear - drinkBy;
    stage = past === 1 ? "pastPeak" : past <= 3 ? "beyondPeak" : "wellBeyondPeak";
  } else if (currentYear < drinkFrom) stage = "young";
  else if (currentYear < peakFrom) {
    const development = peakFrom - drinkFrom;
    const progress = development ? (currentYear - drinkFrom) / development : 1;
    stage = currentYear === peakFrom - 1 ? "nearPeak" : progress < .5 ? "ready" : "excellent";
  } else if (currentYear <= peakUntil) stage = "peak";
  else stage = "nearPeak";

  const readinessPosition = ({ wellBeyondPeak: 1, beyondPeak: 2, pastPeak: 3, young: 4, ready: 5, excellent: 6, nearPeak: 7, peak: 8 } as const)[stage];
  const materialAgeingUpside = (stage === "young" || stage === "ready" || stage === "excellent") && yearsUntilPeak >= 2;
  const targetYear = stage === "young" || stage === "ready" || stage === "excellent" ? peakFrom : currentYear;
  const wait = targetYear - currentYear;
  const outlook: DrinkingOutlook = readinessPosition <= 3 ? "pastPeak" : wait <= 0 ? "drinkNow" : wait <= 2 ? "nextTwoYears" : wait <= 5 ? "threeToFiveYears" : "longTerm";
  // Positive means opening now has a real opportunity cost; quantity only softens it.
  const quantity = "bottleCount" in wine ? wine.bottleCount : 1;
  const preservationScore = materialAgeingUpside ? Math.max(6, 14 - Math.min(4, Math.max(0, quantity - 1))) : stage === "young" ? 16 : 0;
  return { drinkFrom, peakFrom, peakUntil, drinkBy, stage, readinessPosition, outlook, yearsUntilPeak, materialAgeingUpside, preservationScore };
}

export function yearOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\b(19|20|21)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

function clamp(value: number, minimum: number, maximum: number) { return Math.max(minimum, Math.min(maximum, value)); }
