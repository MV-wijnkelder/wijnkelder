import type { StoredWine } from "@/domain/wine";
import { getReadinessPosition, getOutlookKey, type OutlookKey } from "./cellar-insights.ts";
import { getWineType, normalizeCategory, normalizeWineColour } from "./wine-normalization.ts";

export type CellarFilter =
  | { kind: "colour" | "country" | "region" | "grape" | "type"; value: string }
  | { kind: "readiness"; value: string }
  | { kind: "outlook"; value: OutlookKey };

export function filterCellar(wines: StoredWine[], filter: CellarFilter, currentYear = new Date().getUTCFullYear()) {
  return wines.filter((wine) => wine.bottleCount > 0 && matches(wine, filter, currentYear));
}

function matches(wine: StoredWine, filter: CellarFilter, currentYear: number) {
  if (filter.kind === "colour") return normalizeWineColour(wine.wineColor) === normalizeWineColour(filter.value);
  if (filter.kind === "type") return getWineType(wine) === filter.value;
  if (filter.kind === "country" || filter.kind === "region") return normalizeCategory(wine[filter.kind]) === normalizeCategory(filter.value);
  if (filter.kind === "grape") return wine.grapeVarieties.some((grape) => normalizeCategory(grape) === normalizeCategory(filter.value));
  if (filter.kind === "readiness") return getReadinessPosition(wine, currentYear) === Number(filter.value);
  return getOutlookKey(wine, currentYear) === filter.value;
}

export function filterTitle(filter: CellarFilter) {
  if (filter.kind === "colour" || filter.kind === "type") return `${filter.value} Wines`;
  return filter.value;
}
