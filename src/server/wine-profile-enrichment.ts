import type { StoredWine, WineProfile } from "@/domain/wine";

export interface ProfileGenerator { generateWineProfile(wine: StoredWine): Promise<WineProfile> }
export interface ProfileStorage { updateProfile(id: number, profile: WineProfile, refreshed?: boolean): Promise<StoredWine | null> }

export function hasWineProfile(profile: WineProfile): boolean {
  return Boolean(profile.summary || profile.foodPairings.length ||
    profile.wineryInformation || profile.vintageRemarks ||
    profile.tasting.appearance || profile.tasting.aromas.length || profile.tasting.flavors.length || profile.tasting.finish ||
    Object.values(profile.serving).some(Boolean) || Object.values(profile.drinking).some(Boolean) ||
    Object.values(profile.style).some(Boolean));
}

/** Explicit refresh replaces enrichment only and reports failures to the caller so retry messaging is honest. */
export async function refreshWineProfile(wine: StoredWine, generator: ProfileGenerator, storage: ProfileStorage): Promise<StoredWine> {
  const profile = await generator.generateWineProfile(wine);
  if (!hasWineProfile(profile)) throw new Error("AI returned an empty wine profile");
  const saved = await storage.updateProfile(wine.id, profile, true);
  if (!saved) throw new Error("Wine no longer exists while saving its profile");
  return saved;
}

/** Enrich at most once for a populated record; failures leave the stored wine untouched. */
export async function enrichWineProfile(wine: StoredWine, generator: ProfileGenerator, storage: ProfileStorage): Promise<StoredWine> {
  if (hasWineProfile(wine.profile)) return wine;
  console.info("Wine profile enrichment started", { wineId: wine.id });
  try {
    const profile = await generator.generateWineProfile(wine);
    if (!hasWineProfile(profile)) throw new Error("AI returned an empty wine profile");
    const saved = await storage.updateProfile(wine.id, profile);
    if (!saved) throw new Error("Wine no longer exists while saving its profile");
    console.info("Wine profile enrichment completed", { wineId: wine.id });
    return saved;
  } catch (error) {
    console.error("Wine profile enrichment failed", { wineId: wine.id, error });
    return wine;
  }
}
