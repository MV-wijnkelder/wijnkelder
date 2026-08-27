import { neon } from "@neondatabase/serverless";
import { emptyWineProfile } from "@/domain/wine";
import type { Wine, WineProfile } from "@/domain/wine";
import { duplicateKey } from "@/lib/wine-normalization";

export interface StoredWine extends Wine {
  id: number;
  bottleCount: number;
  createdAt: string;
  updatedAt: string;
}

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
  profile: WineProfile | null;
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
    await sql`CREATE INDEX IF NOT EXISTS wines_updated_at_idx ON wines (updated_at DESC)`;
  })().catch((error) => {
    initialization = undefined;
    throw error;
  });
  return initialization;
}

function rowToWine(row: WineRow): StoredWine {
  return {
    id: Number(row.id), producer: row.producer, wineName: row.wine_name,
    vintage: row.vintage, country: row.country, region: row.region,
    appellation: row.appellation, grapeVarieties: row.grape_varieties,
    wineColor: row.wine_color, bottleSize: row.bottle_size,
    alcoholPercentage: row.alcohol_percentage === null ? null : Number(row.alcohol_percentage),
    confidence: row.confidence, profile: normalizeProfile(row.profile), bottleCount: row.bottle_count,
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
  };
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
      INSERT INTO wines (producer, wine_name, vintage, country, region, appellation, grape_varieties, wine_color, bottle_size, alcohol_percentage, confidence, profile, bottle_count, duplicate_key)
      VALUES (${wine.producer}, ${wine.wineName}, ${wine.vintage}, ${wine.country}, ${wine.region}, ${wine.appellation}, ${wine.grapeVarieties}, ${wine.wineColor}, ${wine.bottleSize}, ${wine.alcoholPercentage}, ${wine.confidence}, ${JSON.stringify(normalizeProfile(wine.profile))}, ${count}, ${key})
      ON CONFLICT (duplicate_key) DO UPDATE SET bottle_count = wines.bottle_count + EXCLUDED.bottle_count, updated_at = NOW()
      RETURNING *` as WineRow[];
    return { wine: rowToWine(rows[0]), duplicate: existing.length > 0 };
  }

  async update(id: number, wine: WineInput): Promise<StoredWine | null> {
    await initialize();
    const rows = await client()`
      UPDATE wines SET producer=${wine.producer}, wine_name=${wine.wineName}, vintage=${wine.vintage}, country=${wine.country}, region=${wine.region}, appellation=${wine.appellation}, grape_varieties=${wine.grapeVarieties}, wine_color=${wine.wineColor}, bottle_size=${wine.bottleSize}, alcohol_percentage=${wine.alcoholPercentage}, confidence=${wine.confidence}, profile=${JSON.stringify(normalizeProfile(wine.profile))}, bottle_count=${positiveInteger(wine.bottleCount, 1)}, duplicate_key=${duplicateKey(wine)}, updated_at=NOW()
      WHERE id=${id} RETURNING *` as WineRow[];
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

function normalizeProfile(value: WineProfile | null | undefined): WineProfile {
  const defaults = emptyWineProfile();
  if (!value || typeof value !== "object") return defaults;
  const summary = typeof value.summary === "string" ? value.summary.trim().split(/\s+/).slice(0, 80).join(" ") || null : null;
  return { ...defaults, ...value, serving: { ...defaults.serving, ...value.serving }, drinking: { ...defaults.drinking, ...value.drinking }, style: { ...defaults.style, ...value.style }, foodPairings: Array.isArray(value.foodPairings) ? value.foodPairings : [], summary };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}
