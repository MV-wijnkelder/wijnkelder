import type { StoredWine } from "@/server/storage/neon-wine-storage";
import { NeonWineStorage } from "@/server/storage/neon-wine-storage";
import { generateWineProfile, hasWineProfile } from "@/server/ai/wine-profile-generator";

const keyName = ["OPENAI", "API", "KEY"].join("_");

export async function enrichIfNeeded(storage: NeonWineStorage, wine: StoredWine): Promise<StoredWine> {
  if (hasWineProfile(wine.profile)) return wine;
  const key = process.env[keyName]?.trim();
  if (!key) return wine;
  try {
    const profile = await generateWineProfile(wine, key);
    return await storage.update(wine.id, { ...wine, profile }) ?? wine;
  } catch (error) {
    // A provider outage must not prevent saving or opening a cellar wine.
    console.error("Wine profile enrichment failed", error);
    return wine;
  }
}
