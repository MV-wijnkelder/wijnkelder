import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("../src/app/api/wines/[id]/route.ts", import.meta.url), "utf8");
const storage = readFileSync(new URL("../src/server/storage/neon-wine-storage.ts", import.meta.url), "utf8");
const detail = readFileSync(new URL("../src/app/cellar/[id]/page.tsx", import.meta.url), "utf8");

test("Personal Notes use a backward-compatible nullable column and note-only write", () => {
  assert.match(storage, /ADD COLUMN IF NOT EXISTS personal_notes TEXT/);
  assert.match(storage, /UPDATE wines SET personal_notes=.*updated_at=NOW\(\) WHERE id=/);
  assert.match(storage, /personal_notes\) ILIKE/);
  assert.doesNotMatch(storage.match(/async updatePersonalNotes[\s\S]*?\n  }/)?.[0] ?? "", /market|profile|bottle_count/i);
});

test("note API operations have no AI, web, enrichment, or market-price dependency", () => {
  const patchHandler = route.match(/export async function PATCH[\s\S]*?\n}\n\nexport async function DELETE/)?.[0] ?? "";
  assert.match(patchHandler, /updatePersonalNotes/);
  assert.doesNotMatch(patchHandler, /OpenAI|enrich|MarketValue|web.search/i);
});

test("Wine Detail requires explicit Save or Cancel and supports clearing", () => {
  for (const label of ["Personal Notes", "No personal notes yet.", "Add Note", "Edit Note", "Save", "Cancel"]) assert.match(detail, new RegExp(label));
  assert.match(detail, /textarea/);
  assert.match(detail, /updatePersonalNotes/);
});
