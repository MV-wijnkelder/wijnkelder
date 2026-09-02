import type { Wine } from "@/domain/wine";

const VALUE_ALIASES: Record<string, string> = {
  toscana: "Tuscany",
  tuscany: "Tuscany",
};

/**
 * Canonical display spelling for categorical cellar data. Source records do
 * not need a migration: every read, scan and analytical calculation uses this
 * same boundary.
 */
export function normalizeCategory(value: string | null): string | null {
  const trimmed = value?.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  const key = trimmed.toLocaleLowerCase();
  return VALUE_ALIASES[key] ?? key.replace(/(^|[\s/-])\p{L}/gu, (letter) => letter.toLocaleUpperCase());
}

export function normalizeWineCategories<T extends Wine>(wine: T): T {
  return {
    ...wine,
    country: normalizeCategory(wine.country),
    region: normalizeCategory(wine.region),
    wineColor: normalizeCategory(wine.wineColor),
    grapeVarieties: [...new Set(wine.grapeVarieties.map(normalizeCategory).filter((value): value is string => value !== null))],
  };
}

/** Canonical identity used when deciding whether a scan adds another bottle. */
export function duplicateKey(wine: Pick<Wine, "producer" | "wineName" | "vintage">): string {
  return [wine.producer, wine.wineName, wine.vintage]
    .map((value) => value?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") ?? "")
    .join("\u001f");
}
