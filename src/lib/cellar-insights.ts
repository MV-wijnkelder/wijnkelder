import type { StoredWine } from "@/domain/wine";

export type DistributionItem = { label: string; bottles: number; percentage: number };

export type CellarInsights = {
  bottles: number;
  wines: number;
  countries: number;
  regions: number;
  readiness: { stars: number; label: string; bottles: number }[];
  horizon: { year: number; wines: number }[];
  mix: {
    colours: DistributionItem[];
    countries: DistributionItem[];
    regions: DistributionItem[];
    grapes: DistributionItem[];
  };
  value: { currency: string; total: number; average: number; highest: number; pricedBottles: number } | null;
  highlights: { oldest: string | null; youngest: string | null; producer: string | null; country: string | null; region: string | null };
  insights: string[];
  health: number;
};

const readinessLabels = [
  "Too young or beyond peak",
  "Hold or drink soon",
  "Entering or leaving the ideal window",
  "Excellent",
  "Peak drinking",
] as const;

export function getReadinessStars(wine: StoredWine, currentYear = new Date().getUTCFullYear()): number | null {
  const from = yearOf(wine.profile.drinking.drinkFrom);
  const until = yearOf(wine.profile.drinking.drinkUntil);
  if (from === null || until === null || until < from) return null;
  const midpoint = (from + until) / 2;
  const halfWindow = Math.max((until - from) / 2, 1);
  const distance = Math.abs(currentYear - midpoint);
  if (distance <= halfWindow * .35) return 5;
  if (distance <= halfWindow) return 4;
  if (distance <= halfWindow + 1) return 3;
  if (distance <= halfWindow + 3) return 2;
  return 1;
}

export function buildCellarInsights(wines: StoredWine[], currentYear = new Date().getUTCFullYear()): CellarInsights {
  const active = wines.filter((wine) => wine.bottleCount > 0);
  const bottles = active.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const colours = distribution(active, (wine) => values(wine.wineColor));
  const countries = distribution(active, (wine) => values(wine.country));
  const regions = distribution(active, (wine) => values(wine.region));
  const grapes = distribution(active, (wine) => wine.grapeVarieties);
  const readinessCounts = new Map<number, number>();
  active.forEach((wine) => {
    const stars = getReadinessStars(wine, currentYear);
    if (stars) readinessCounts.set(stars, (readinessCounts.get(stars) ?? 0) + wine.bottleCount);
  });
  const readiness = [5, 4, 3, 2, 1].map((stars) => ({ stars, label: readinessLabels[stars - 1], bottles: readinessCounts.get(stars) ?? 0 }));
  const horizonCounts = new Map<number, number>();
  active.forEach((wine) => {
    const year = yearOf(wine.profile.drinking.drinkFrom);
    if (year !== null) horizonCounts.set(year, (horizonCounts.get(year) ?? 0) + 1);
  });
  const horizon = [...horizonCounts].sort(([a], [b]) => a - b).map(([year, count]) => ({ year, wines: count }));
  const vintages = active.map((wine) => yearOf(wine.vintage)).filter((year): year is number => year !== null);
  const highlights = {
    oldest: vintages.length ? String(Math.min(...vintages)) : null,
    youngest: vintages.length ? String(Math.max(...vintages)) : null,
    producer: largest(active, (wine) => wine.producer),
    country: largest(active, (wine) => wine.country),
    region: largest(active, (wine) => wine.region),
  };
  const value = collectionValue(active);
  const peak = horizon.reduce<{ year: number; wines: number } | null>((best, item) => !best || item.wines > best.wines ? item : best, null);
  const nextYear = active.reduce((sum, wine) => {
    const until = yearOf(wine.profile.drinking.drinkUntil);
    return sum + (until !== null && until >= currentYear && until <= currentYear + 1 ? wine.bottleCount : 0);
  }, 0);
  const insights: string[] = [];
  if (countries[0]) insights.push(`${countries[0].label} leads your cellar at ${countries[0].percentage}%.`);
  if (nextYear) insights.push(`${nextYear} ${nextYear === 1 ? "bottle is" : "bottles are"} best opened within the next year.`);
  if (peak) insights.push(`Your strongest new drinking period arrives in ${peak.year}.`);
  if (colours.length > 1) {
    const smallest = colours[colours.length - 1];
    if (smallest.percentage <= 10) insights.push(`${smallest.label} wines represent only ${smallest.percentage}% of the collection.`);
  }
  if (grapes.length >= 4) insights.push(`${grapes.length} grape varieties give the collection meaningful breadth.`);

  const readinessKnown = readiness.reduce((sum, item) => sum + item.bottles, 0);
  const readinessScore = readinessKnown ? readiness.reduce((sum, item) => sum + item.stars * item.bottles, 0) / readinessKnown / 5 : .5;
  const balanceScore = balance(colours);
  const varietyScore = Math.min(1, (countries.length + regions.length + grapes.length) / 18);
  const horizonScore = bottles ? readinessKnown / bottles : 0;
  const duplicateScore = bottles ? Math.min(1, active.length / bottles * 2) : 0;
  const health = bottles ? Math.round((readinessScore * .3 + balanceScore * .2 + varietyScore * .2 + horizonScore * .2 + duplicateScore * .1) * 100) : 0;

  return { bottles, wines: active.length, countries: countries.length, regions: regions.length, readiness, horizon, mix: { colours, countries, regions, grapes }, value, highlights, insights: insights.slice(0, 4), health };
}

function values(value: string | null): string[] { return value?.trim() ? [value.trim()] : []; }
function yearOf(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\b(19|20|21)\d{2}\b/);
  return match ? Number(match[0]) : null;
}
function distribution(wines: StoredWine[], select: (wine: StoredWine) => string[]): DistributionItem[] {
  const counts = new Map<string, number>();
  wines.forEach((wine) => select(wine).forEach((raw) => {
    const label = raw.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + wine.bottleCount);
  }));
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, bottles: count, percentage: total ? Math.round(count / total * 100) : 0 }));
}
function largest(wines: StoredWine[], select: (wine: StoredWine) => string | null): string | null {
  return distribution(wines, (wine) => values(select(wine)))[0]?.label ?? null;
}
function collectionValue(wines: StoredWine[]): CellarInsights["value"] {
  const currencyCounts = new Map<string, number>();
  wines.forEach((wine) => { if (wine.cellar.purchasePrice !== null) currencyCounts.set(wine.cellar.purchaseCurrency ?? "EUR", (currencyCounts.get(wine.cellar.purchaseCurrency ?? "EUR") ?? 0) + wine.bottleCount); });
  const currency = [...currencyCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!currency) return null;
  const priced = wines.filter((wine) => wine.cellar.purchasePrice !== null && (wine.cellar.purchaseCurrency ?? "EUR") === currency);
  const pricedBottles = priced.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const total = priced.reduce((sum, wine) => sum + (wine.cellar.purchasePrice ?? 0) * wine.bottleCount, 0);
  return { currency, total, average: total / pricedBottles, highest: Math.max(...priced.map((wine) => wine.cellar.purchasePrice ?? 0)), pricedBottles };
}
function balance(items: DistributionItem[]): number {
  if (!items.length) return 0;
  const dominance = items[0].percentage / 100;
  return Math.max(0, Math.min(1, (1 - dominance) / .65));
}
