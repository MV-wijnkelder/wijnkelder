import assert from "node:assert/strict";
import test from "node:test";
import { WineService } from "../src/services/wine-service.ts";

const wine = {
  producer: "Estate", wineName: "Reserve", vintage: "2022", country: "France",
  region: "Bordeaux", appellation: null, grapeVarieties: ["Merlot"], wineColor: "Red",
  bottleSize: "750 ml", alcoholPercentage: 13.5, confidence: 92,
};
const stored = { ...wine, id: 4, bottleCount: 1, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };

test("saves a recognized wine through POST /api/wines", async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wines"); assert.equal(init.method, "POST"); assert.deepEqual(JSON.parse(init.body), wine);
    return Response.json({ wine: stored, duplicate: false }, { status: 201 });
  }, async () => assert.deepEqual(await WineService.add(wine), { wine: stored, duplicate: false }));
});

test("explores a wine through the non-persisting profile endpoint", async () => {
  const explored = { ...wine, profile: { summary: "Profile" } };
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wine-profile");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body), wine);
    return Response.json(explored);
  }, async () => assert.deepEqual(await WineService.explore(wine), explored));
});

test("loads the cellar with an encoded search query", async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wines?q=ch%C3%A2teau%20rouge");
    assert.equal(init.cache, "no-store");
    return Response.json([stored]);
  },
    async () => assert.deepEqual(await WineService.list("château rouge"), [stored]));
});

test("updates wine details and bottle counts", async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wines/4");
    if (init.method === "PUT") { assert.equal(JSON.parse(init.body).wineName, "Reserve"); return Response.json(stored); }
    assert.equal(init.method, "PATCH"); assert.deepEqual(JSON.parse(init.body), { change: 1 }); return Response.json({ ...stored, bottleCount: 2 });
  }, async () => {
    assert.deepEqual(await WineService.update(stored), stored);
    assert.equal((await WineService.changeBottleCount(4, 1)).bottleCount, 2);
  });
});

test("deletes a wine and surfaces API errors", async () => {
  let deleted = false;
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wines/4");
    assert.equal(init.method, "DELETE");
    deleted = true;
    return new Response(null, { status: 204 });
  }, () => WineService.delete(stored.id));
  await withFetch(async (url, init) => {
    assert.equal(url, "/api/wines?q=reserve");
    assert.equal(init.cache, "no-store");
    assert.equal(deleted, true);
    return Response.json([]);
  }, async () => assert.deepEqual(await WineService.list("reserve"), []));
  await withFetch(async () => Response.json({ error: "Database niet bereikbaar." }, { status: 503 }),
    async () => assert.rejects(WineService.list(), /Database niet bereikbaar/));
});

async function withFetch(mock, operation) {
  const original = globalThis.fetch;
  globalThis.fetch = mock;
  try { return await operation(); } finally { globalThis.fetch = original; }
}
