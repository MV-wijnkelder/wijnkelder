export const CELLAR_STATE_KEY = "mchrdv:cellar-navigation:v1";
export type CellarNavigationState = { search: string; scrollY: number; wineId: number | null };
export const emptyCellarNavigationState: CellarNavigationState = { search: "", scrollY: 0, wineId: null };
export function parseCellarNavigationState(value: string | null): CellarNavigationState {
  if (!value) return emptyCellarNavigationState;
  try {
    const candidate = JSON.parse(value) as Partial<CellarNavigationState>;
    return { search: typeof candidate.search === "string" ? candidate.search : "", scrollY: typeof candidate.scrollY === "number" && candidate.scrollY >= 0 ? candidate.scrollY : 0, wineId: Number.isSafeInteger(candidate.wineId) && Number(candidate.wineId) > 0 ? Number(candidate.wineId) : null };
  } catch { return emptyCellarNavigationState; }
}
