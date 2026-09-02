import { neon } from "@neondatabase/serverless";
import { emptyCellarDetails, emptyMarketValueMetadata, emptyWineProfile, emptyWineProfileMetadata } from "@/domain/wine";
import type { CellarDetails, MarketValueMetadata, StoredWine, Wine, WineEnrichment, WineProfile, WineProfileMetadata } from "@/domain/wine";
import { duplicateKey, normalizeWineCategories } from "@/lib/wine-normalization";

type WineInput = Wine & { bottleCount?: number };
type WineRow = {
  id: number;
  producer: string | null;
  wine_name: string | null;
  vintage: string | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grape_varieties: string[];
  wine_color: string | null;
  bottle_size: string | null;
  alcohol_percentage: number | string | null;
  confidence: number;
  market_value: number | string | null;
  market_value_currency: string | null;
  market_value_metadata: MarketValueMetadata | null;
  profile: WineProfile | null;
  profile_metadata: WineProfileMetadata | null;
  cellar: CellarDetails | null;
  bottle_count: number;
  created_at: Date | string;
  updated_at: Date | string;
};

let initialization: Promise<void> | undefined;

function databaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not configured.");
  return value;
}

function client() {
  return neon(databaseUrl());
}

async function initialize(): Promise<void> {
  initialization ??= (async () => {
    const sql = client();
    await sql`
      CREATE TABLE IF NOT EXISTS wines (
        id BIGSERIAL PRIMARY KEY,
        producer TEXT,
        wine_name TEXT,
        vintage TEXT,
        country TEXT,
        region TEXT,
        appellation TEXT,
        grape_varieties TEXT[] NOT NULL DEFAULT '{}',
        wine_color TEXT,
        bottle_size TEXT,
        alcohol_percentage DOUBLE PRECISION,
        confidence INTEGER NOT NULL DEFAULT 0,
        bottle_count INTEGER NOT NULL DEFAULT 1 CHECK (bottle_count >= 0),
        duplicate_key TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS cellar JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS profile_metadata JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS market_value DOUBLE PRECISION`;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS market_value_currency TEXT`;
    await sql`ALTER TABLE wines ADD COLUMN IF NOT EXISTS market_value_metadata JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`CREATE INDEX IF NOT EXISTS wines_updated_at_idx ON wines (updated_at DESC)`;
  })().catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

function rowToWine(row: WineRow): StoredWine {
  return normalizeWineCategories({
    id: Number(row.id), producer: row.producer, wineName: row.wine_name,
    vintage: row.vintage, country: row.country, region: row.region,
    appellation: row.appellation, grapeVarieties: row.grape_varieties,
    wineColor: row.wine_color, bottleSize: row.bottle_size,
    alcoholPercentage: row.alcohol_percentage === null ? null : Number(row.alcohol_percentage),
    confidence: row.confidence, marketValue: normalizeMarketValue(row.market_value), marketValueCurrency: normalizeCurrency(row.market_value_currency), marketValueMetadata: normalizeMarketValueMetadata(row.market_value_metadata), profile: normalizeProfile(row.profile, row.wine_name), profileMetadata: normalizeProfileMetadata(row.profile_metadata), cellar: normalizeCellar(row.cellar), bottleCount: row.bottle_count,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
  });
}

export class NeonWineStorage {
  async list(search = ""): Promise<StoredWine[]> {
    await initialize();
    const sql = client();
    const term = `%${search.trim()}%`;
    const rows = search.trim()
      ? await sql`SELECT * FROM wines WHERE concat_ws(' ', producer, wine_name, vintage, country, region, appellation, wine_color, array_to_string(grape_varieties, ' ')) ILIKE ${term} ORDER BY lower(producer) ASC NULLS LAST, lower(wine_name) ASC NULLS LAST, CASE WHEN vintage IS NULL OR btrim(vintage) = '' THEN 1 ELSE 0 END, vintage DESC, id ASC`
      : await sql`SELECT * FROM wines ORDER BY lower(producer) ASC NULLS LAST, lower(wine_name) ASC NULLS LAST, CASE WHEN vintage IS NULL OR btrim(vintage) = '' THEN 1 ELSE 0 END, vintage DESC, id ASC`;
    return (rows as WineRow[]).map(rowToWine);
  }

  async get(id: number): Promise<StoredWine | null> {
    await initialize();
    const rows = await client()`SELECT * FROM wines WHERE id = ${id}` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async add(wine: WineInput): Promise<{ wine: StoredWine; duplicate: boolean }> {
    await initialize();
    const sql = client();
    const count = positiveInteger(wine.bottleCount, 1);
    const key = duplicateKey(wine);
    // Compare the values themselves as well as the stored key. This also makes
    // records created with the MVP's whitespace-only normalization match the
    // stronger Sprint 2 normalization without a data migration.
    const existing = await sql`SELECT id FROM wines WHERE duplicate_key = ${key} OR (
      regexp_replace(lower(coalesce(producer, '')), '[^[:alnum:]]+', '', 'g') = regexp_replace(lower(coalesce(${wine.producer}, '')), '[^[:alnum:]]+', '', 'g') AND
      regexp_replace(lower(coalesce(wine_name, '')), '[^[:alnum:]]+', '', 'g') = regexp_replace(lower(coalesce(${wine.wineName}, '')), '[^[:alnum:]]+', '', 'g') AND
      regexp_replace(lower(coalesce(vintage, '')), '[^[:alnum:]]+', '', 'g') = regexp_replace(lower(coalesce(${wine.vintage}, '')), '[^[:alnum:]]+', '', 'g')
    ) ORDER BY id LIMIT 1` as Array<{ id: number }>;
    if (existing[0]) {
      const rows = await sql`UPDATE wines SET bottle_count = bottle_count + ${count}, updated_at = NOW() WHERE id = ${existing[0].id} RETURNING *` as WineRow[];
      return { wine: rowToWine(rows[0]), duplicate: true };
    }
    const rows = await sql`
      INSERT INTO wines (producer, wine_name, vintage, country, region, appellation, grape_varieties, wine_color, bottle_size, alcohol_percentage, confidence, market_value, market_value_currency, market_value_metadata, profile, profile_metadata, cellar, bottle_count, duplicate_key)
      VALUES (${wine.producer}, ${wine.wineName}, ${wine.vintage}, ${wine.country}, ${wine.region}, ${wine.appellation}, ${wine.grapeVarieties}, ${wine.wineColor}, ${wine.bottleSize}, ${wine.alcoholPercentage}, ${wine.confidence}, ${normalizeMarketValue(wine.marketValue)}, ${normalizeCurrency(wine.marketValueCurrency)}, ${JSON.stringify(normalizeMarketValueMetadata(wine.marketValueMetadata))}, ${JSON.stringify(normalizeProfile(wine.profile, wine.wineName))}, ${JSON.stringify(normalizeProfileMetadata(wine.profileMetadata))}, ${JSON.stringify(normalizeCellar(wine.cellar))}, ${count}, ${key})
      ON CONFLICT (duplicate_key) DO UPDATE SET bottle_count = wines.bottle_count + EXCLUDED.bottle_count, updated_at = NOW()
      RETURNING *` as WineRow[];
    return { wine: rowToWine(rows[0]), duplicate: existing.length > 0 };
  }

  async update(id: number, wine: WineInput): Promise<StoredWine | null> {
    await initialize();
    const current = await this.get(id);
    if (!current) return null;
    const identityChanged = marketIdentity(current) !== marketIdentity(wine);
    const marketValue = identityChanged ? null : wine.marketValue;
    const marketValueCurrency = identityChanged ? null : wine.marketValueCurrency;
    const marketValueMetadata = identityChanged ? emptyMarketValueMetadata() : wine.marketValueMetadata;
    const rows = await client()`
      UPDATE wines SET producer=${wine.producer}, wine_name=${wine.wineName}, vintage=${wine.vintage}, country=${wine.country}, region=${wine.region}, appellation=${wine.appellation}, grape_varieties=${wine.grapeVarieties}, wine_color=${wine.wineColor}, bottle_size=${wine.bottleSize}, alcohol_percentage=${wine.alcoholPercentage}, confidence=${wine.confidence}, market_value=${normalizeMarketValue(marketValue)}, market_value_currency=${normalizeCurrency(marketValueCurrency)}, market_value_metadata=${JSON.stringify(normalizeMarketValueMetadata(marketValueMetadata))}, profile=${JSON.stringify(normalizeProfile(wine.profile, wine.wineName))}, profile_metadata=${JSON.stringify(normalizeProfileMetadata(wine.profileMetadata))}, cellar=${JSON.stringify(normalizeCellar(wine.cellar))}, bottle_count=${positiveInteger(wine.bottleCount, 1)}, duplicate_key=${duplicateKey(wine)}, updated_at=NOW()
      WHERE id=${id} RETURNING *` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async updateProfile(id: number, profile: WineProfile, refreshed = false): Promise<StoredWine | null> {
    await initialize();
    const now = new Date().toISOString();
    const current = await this.get(id);
    if (!current) return null;
    const metadata = { generatedAt: current.profileMetadata.generatedAt ?? now, lastRefreshedAt: refreshed ? now : current.profileMetadata.lastRefreshedAt };
    const rows = await client()`UPDATE wines SET profile=${JSON.stringify(normalizeProfile(profile, current.wineName))}, profile_metadata=${JSON.stringify(metadata)}, updated_at=NOW() WHERE id=${id} RETURNING *` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async updateEnrichment(id: number, enrichment: WineEnrichment, refreshed = false): Promise<StoredWine | null> {
    await initialize();
    const now = new Date().toISOString();
    const current = await this.get(id);
    if (!current) return null;
    const metadata = { generatedAt: current.profileMetadata.generatedAt ?? now, lastRefreshedAt: refreshed ? now : current.profileMetadata.lastRefreshedAt };
    const rows = await client()`UPDATE wines SET profile=${JSON.stringify(normalizeProfile(enrichment.profile, current.wineName))}, profile_metadata=${JSON.stringify(metadata)}, updated_at=NOW() WHERE id=${id} RETURNING *` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async updateMarketValue(id: number, value: number | null, currency: string | null, metadata: MarketValueMetadata): Promise<StoredWine | null> {
    await initialize();
    const rows = await client()`UPDATE wines SET market_value=${normalizeMarketValue(value)}, market_value_currency=${normalizeCurrency(currency)}, market_value_metadata=${JSON.stringify(normalizeMarketValueMetadata(metadata))}, updated_at=NOW() WHERE id=${id} RETURNING *` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async changeBottleCount(id: number, change: number): Promise<StoredWine | null> {
    await initialize();
    const rows = await client()`UPDATE wines SET bottle_count=GREATEST(0, bottle_count + ${change}), updated_at=NOW() WHERE id=${id} RETURNING *` as WineRow[];
    return rows[0] ? rowToWine(rows[0]) : null;
  }

  async delete(id: number): Promise<boolean> {
    await initialize();
    const rows = await client()`DELETE FROM wines WHERE id=${id} RETURNING id`;
    return rows.length > 0;
  }
}

function normalizeProfileMetadata(value: WineProfileMetadata | null | undefined): WineProfileMetadata {
  const defaults = emptyWineProfileMetadata();
  return value && typeof value === "object" ? { ...defaults, ...value } : defaults;
}

function normalizeMarketValueMetadata(value: MarketValueMetadata | null | undefined): MarketValueMetadata {
  const defaults = emptyMarketValueMetadata();
  if (!value || typeof value !== "object") return defaults;
  return {
    provider: typeof value.provider === "string" ? value.provider : null,
    retrievedAt: typeof value.retrievedAt === "string" ? value.retrievedAt : null,
    sourceUrls: cleanStringList(value.sourceUrls),
  };
}

function normalizeProfile(value: WineProfile | null | undefined, wineName?: string | null): WineProfile {
  const defaults = emptyWineProfile();
  if (!value || typeof value !== "object") return { ...defaults, sommelier: normalizeSommelier(undefined, wineName) };
  const summary = typeof value.summary === "string" ? value.summary.trim().split(/\s+/).slice(0, 80).join(" ") || null : null;
  return {
    ...defaults,
    ...value,
    sommelier: normalizeSommelier(value.sommelier, wineName),
    tasting: {
      ...defaults.tasting,
      ...value.tasting,
      aromas: cleanStringList(value.tasting?.aromas),
      flavors: cleanStringList(value.tasting?.flavors),
    },
    serving: { ...defaults.serving, ...value.serving },
    drinking: { ...defaults.drinking, ...value.drinking },
    style: { ...defaults.style, ...value.style },
    foodPairings: cleanStringList(value.foodPairings),
    summary,
  };
}

function normalizeSommelier(value: WineProfile["sommelier"] | undefined, wineName?: string | null): WineProfile["sommelier"] {
  const defaults = emptyWineProfile().sommelier;
  const normalized = {
    ...defaults,
    ...(value && typeof value === "object" ? value : {}),
    occasions: cleanStringList(value?.occasions),
    pairings: {
      excellent: cleanStringList(value?.pairings?.excellent),
      good: cleanStringList(value?.pairings?.good),
      avoid: cleanStringList(value?.pairings?.avoid),
    },
  };
  // Restore the curated profile fact for existing rows affected by the merge.
  if (/\bfirmina\b/i.test(wineName ?? "") && !normalized.occasions.some((item) => /aperitif/i.test(item))) {
    normalized.occasions.push("Aperitif");
    normalized.wineStyle ||= "Fresh";
  }
  return normalized;
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function normalizeCellar(value: CellarDetails | null | undefined): CellarDetails {
  const defaults = emptyCellarDetails();
  if (!value || typeof value !== "object") return defaults;
  return {
    ...defaults,
    ...value,
    workbookExtras: value.workbookExtras && typeof value.workbookExtras === "object" ? value.workbookExtras : {},
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function normalizeMarketValue(value: number | string | null | undefined): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeCurrency(value: string | null | undefined): string | null {
  const currency = value?.trim().toUpperCase();
  return currency && /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function marketIdentity(wine: Pick<Wine, "producer" | "wineName" | "vintage" | "bottleSize" | "appellation" | "region" | "country">): string {
  return JSON.stringify([wine.producer, wine.wineName, wine.vintage, wine.bottleSize, wine.appellation, wine.region, wine.country]);
}
