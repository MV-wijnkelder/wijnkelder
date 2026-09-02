import type { StoredWine } from "@/domain/wine";
import { getWineType, normalizeCategory, normalizeWineColour } from "./wine-normalization.ts";
import { getDrinkingLifecycle, yearOf } from "./drinking-lifecycle.ts";

export type DistributionItem = { label: string; bottles: number; percentage: number };
export type OutlookKey = "pastPeak" | "drinkNow" | "nextTwoYears" | "threeToFiveYears" | "longTerm";
export type OutlookItem = { key: OutlookKey; label: string; bottles: number };

export type CellarInsights = {
  bottles: number; wines: number; countries: number; regions: number;
  readiness: { position: number; label: string; bottles: number }[];
  outlook: OutlookItem[]; outlookInsight: string | null;
  mix: { colours: DistributionItem[]; types: DistributionItem[]; countries: DistributionItem[]; regions: DistributionItem[]; grapes: DistributionItem[] };
  value: { currency: string; total: number; average: number; highest: number; valuedBottles: number; unvaluedBottles: number; totalBottles: number; coveragePercentage: number };
  highlights: { oldest: string | null; youngest: string | null; producer: string | null; country: string | null; region: string | null };
  insights: string[]; health: number;
};

const readinessLabels = ["Well beyond peak", "Beyond peak", "Past peak", "Young", "Ready", "Excellent", "Near peak", "Peak drinking"] as const;
const outlookLabels: Record<OutlookKey, string> = {
  pastPeak: "past peak", drinkNow: "ready now", nextTwoYears: "best in the next 1–2 years",
  threeToFiveYears: "best in 3–5 years", longTerm: "long-term bottles",
};

/** One dynamic, continuous lifecycle: 1–3 are past peak; 4–8 retain the former five positive levels. */
export function getReadinessPosition(wine: StoredWine, currentYear = new Date().getUTCFullYear()): number | null {
  return getDrinkingLifecycle(wine, currentYear)?.readinessPosition ?? null;
}

/** Backward-compatible name for callers of the former five-star helper. */
export const getReadinessStars = getReadinessPosition;

export function buildCellarInsights(wines: StoredWine[], currentYear = new Date().getUTCFullYear()): CellarInsights {
  const active = wines.filter((wine) => wine.bottleCount > 0);
  const bottles = active.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const colours = distribution(active, (wine) => { const colour = normalizeWineColour(wine.wineColor); return colour ? [colour] : []; });
  const types = distribution(active, (wine) => [getWineType(wine)]);
  const countries = distribution(active, (wine) => values(wine.country));
  const regions = distribution(active, (wine) => values(wine.region));
  const grapes = distribution(active, (wine) => wine.grapeVarieties);
  const readinessCounts = new Map<number, number>();
  active.forEach((wine) => { const position = getReadinessPosition(wine, currentYear); if (position) readinessCounts.set(position, (readinessCounts.get(position) ?? 0) + wine.bottleCount); });
  const readiness = [8, 7, 6, 5, 4, 3, 2, 1].map((position) => ({ position, label: readinessLabels[position - 1], bottles: readinessCounts.get(position) ?? 0 }));
  const outlookCounts = new Map<OutlookKey, number>();
  active.forEach((wine) => { const key = getOutlookKey(wine, currentYear); if (key) outlookCounts.set(key, (outlookCounts.get(key) ?? 0) + wine.bottleCount); });
  const outlook = (["pastPeak", "drinkNow", "nextTwoYears", "threeToFiveYears", "longTerm"] as OutlookKey[]).map((key) => ({ key, label: outlookLabels[key], bottles: outlookCounts.get(key) ?? 0 }));
  const pastPeak = outlookCounts.get("pastPeak") ?? 0;
  const endingSoon = active.reduce((sum, wine) => { const until = yearOf(wine.profile.drinking.drinkUntil); return sum + (until !== null && until >= currentYear && until <= currentYear + 1 ? wine.bottleCount : 0); }, 0);
  const outlookInsight = pastPeak ? `${pastPeak} ${pastPeak === 1 ? "bottle is" : "bottles are"} past peak and should be prioritised.` : endingSoon ? `${endingSoon} ${endingSoon === 1 ? "bottle is" : "bottles are"} approaching the end of the optimal drinking window.` : null;
  const vintages = active.map((wine) => yearOf(wine.vintage)).filter((year): year is number => year !== null);
  const highlights = { oldest: vintages.length ? String(Math.min(...vintages)) : null, youngest: vintages.length ? String(Math.max(...vintages)) : null, producer: largest(active, (wine) => wine.producer), country: largest(active, (wine) => wine.country), region: largest(active, (wine) => wine.region) };
  const value = collectionValue(active);
  const insights: string[] = [];
  if (countries[0]) insights.push(`${countries[0].label} leads your cellar at ${countries[0].percentage}%.`);
  if (endingSoon) insights.push(`${endingSoon} ${endingSoon === 1 ? "bottle is" : "bottles are"} best opened within the next year.`);
  if (colours.length > 1) { const smallest = colours[colours.length - 1]; if (smallest.percentage <= 10) insights.push(`${smallest.label} wines represent only ${smallest.percentage}% of the collection.`); }
  if (grapes.length >= 4) insights.push(`${grapes.length} grape varieties give the collection meaningful breadth.`);
  const readinessKnown = readiness.reduce((sum, item) => sum + item.bottles, 0);
  const readinessScore = readinessKnown ? readiness.reduce((sum, item) => sum + item.position * item.bottles, 0) / readinessKnown / 8 : .5;
  const health = bottles ? Math.round((readinessScore * .3 + balance(colours) * .2 + Math.min(1, (countries.length + regions.length + grapes.length) / 18) * .2 + readinessKnown / bottles * .2 + Math.min(1, active.length / bottles * 2) * .1) * 100) : 0;
  return { bottles, wines: active.length, countries: countries.length, regions: regions.length, readiness, outlook, outlookInsight, mix: { colours, types, countries, regions, grapes }, value, highlights, insights: insights.slice(0, 4), health };
}

export function getOutlookKey(wine: StoredWine, currentYear = new Date().getUTCFullYear()): OutlookKey | null { return getDrinkingLifecycle(wine, currentYear)?.outlook ?? null; }
function values(value: string | null): string[] { const normalized = normalizeCategory(value); return normalized ? [normalized] : []; }
function distribution(wines: StoredWine[], select: (wine: StoredWine) => string[]): DistributionItem[] { const counts = new Map<string, number>(); wines.forEach((wine) => select(wine).forEach((raw) => { const label = normalizeCategory(raw); if (label) counts.set(label, (counts.get(label) ?? 0) + wine.bottleCount); })); const total = [...counts.values()].reduce((sum, count) => sum + count, 0); return [...counts].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, bottles: count, percentage: total ? Math.round(count / total * 100) : 0 })); }
function largest(wines: StoredWine[], select: (wine: StoredWine) => string | null): string | null { return distribution(wines, (wine) => values(select(wine)))[0]?.label ?? null; }
function collectionValue(wines: StoredWine[]): CellarInsights["value"] { const valued = wines.filter((wine) => wine.marketValue !== null); const totalBottles = wines.reduce((sum, wine) => sum + wine.bottleCount, 0); const valuedBottles = valued.reduce((sum, wine) => sum + wine.bottleCount, 0); const total = valued.reduce((sum, wine) => sum + (wine.marketValue ?? 0) * wine.bottleCount, 0); return { currency: valued.find((wine) => wine.marketValueCurrency)?.marketValueCurrency ?? "EUR", total, average: valuedBottles ? total / valuedBottles : 0, highest: valued.length ? Math.max(...valued.map((wine) => wine.marketValue ?? 0)) : 0, valuedBottles, unvaluedBottles: totalBottles - valuedBottles, totalBottles, coveragePercentage: totalBottles ? Math.round(valuedBottles / totalBottles * 100) : 0 }; }
function balance(items: DistributionItem[]): number { if (!items.length) return 0; return Math.max(0, Math.min(1, (1 - items[0].percentage / 100) / .65)); }
