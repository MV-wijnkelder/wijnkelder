import type { Wine } from "@/domain/wine";

const VALUE_ALIASES: Record<string, string> = {
  toscana: "Tuscany",
  tuscany: "Tuscany",
};

export type WineColour = "Red" | "White" | "Rosé";
export type WineType = "Still" | "Sparkling";

export function normalizeWineColour(value: string | null): WineColour | null {
  const key = value?.trim().normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
  if (key === "red") return "Red";
  if (key === "white") return "White";
  if (key === "rose" || key === "rosé") return "Rosé";
  return null;
}

const SPARKLING_TERMS = /\b(champagne|franciacorta|prosecco|cava|cremant|crémant|sekt|sparkling|spumante|mousseux|espumante)\b/i;

/** Explicit structured style wins; identity text is only a fallback for older records. */
export function getWineType(wine: Wine): WineType {
  const explicit = [wine.profile.sommelier.wineStyle, wine.profile.style.wineStyle].filter(Boolean).join(" ");
  if (/\bstill\b/i.test(explicit)) return "Still";
  if (SPARKLING_TERMS.test(explicit)) return "Sparkling";
  return SPARKLING_TERMS.test([wine.appellation, wine.region, wine.wineName].filter(Boolean).join(" ")) ? "Sparkling" : "Still";
}

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
    wineColor: normalizeWineColour(wine.wineColor),
    grapeVarieties: [...new Set(wine.grapeVarieties.map(normalizeCategory).filter((value): value is string => value !== null))],
  };
}

/** Canonical identity used when deciding whether a scan adds another bottle. */
export function duplicateKey(wine: Pick<Wine, "producer" | "wineName" | "vintage">): string {
  return [wine.producer, wine.wineName, wine.vintage]
    .map((value) => value?.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") ?? "")
    .join("\u001f");
}
