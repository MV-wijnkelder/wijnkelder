import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { ExcelStorageError, ExcelStorageService } from "../src/services/storage/excel-storage-service.ts";

const headers = ["Producent", "Wijnnaam", "Jaargang", "Land", "Regio", "Appellatie", "Druivenrassen", "Wijnkleur", "Flesformaat", "Alcoholpercentage", "Zekerheid", "Aantal flessen"];
const wine = { producer: "Maison Test", wineName: "Réserve", vintage: "2021", country: "Frankrijk", region: "Rhône", appellation: "AOC", grapeVarieties: ["Syrah"], wineColor: "Rood", bottleSize: "750 ml", alcoholPercentage: 13.5, confidence: 94 };
let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  Object.assign(process.env, { MICROSOFT_TENANT_ID: "tenant", MICROSOFT_CLIENT_ID: "client", MICROSOFT_CLIENT_SECRET: "secret", ONEDRIVE_FILE_ID: "file", EXCEL_TABLE_NAME: "Wijnen" });
});
afterEach(() => { globalThis.fetch = originalFetch; });

function graphMock({ initialRows = [], lockedWrites = 0, failAt } = {}) {
  const rows = structuredClone(initialRows);
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (failAt && url.includes(failAt)) return Response.json({ error: {} }, { status: 500 });
    if (url.includes("login.microsoftonline.com")) return Response.json({ access_token: "token" });
    if (url.endsWith("/workbook/createSession")) {
      if (lockedWrites-- > 0) return Response.json({}, { status: 423 });
      return Response.json({ id: "session-1" });
    }
    if (url.endsWith("/workbook/closeSession")) return new Response(null, { status: 204 });
    if (url.endsWith("/headerRowRange")) return Response.json({ values: [headers] });
    if (url.endsWith("/rows") && (init.method ?? "GET") === "GET") return Response.json({ value: rows.map((values) => ({ values: [values] })) });
    if (url.endsWith("/rows/add")) {
      if (lockedWrites-- > 0) return Response.json({}, { status: 423 });
      rows.push(JSON.parse(String(init.body)).values[0]);
      return Response.json({ index: rows.length - 1 });
    }
    const rowMatch = url.match(/itemAt\(index=(\d+)\)\/range$/);
    if (rowMatch) {
      if (lockedWrites-- > 0) return Response.json({}, { status: 423 });
      const patch = JSON.parse(String(init.body)).values[0];
      patch.forEach((value, index) => { if (value !== null) rows[Number(rowMatch[1])][index] = value; });
      return Response.json({});
    }
    return Response.json({ id: "resource" });
  };
  return { rows, calls };
}

function existing(quantity = 2) {
  return [wine.producer, wine.wineName, wine.vintage, wine.country, wine.region, wine.appellation, wine.grapeVarieties.join(", "), wine.wineColor, wine.bottleSize, wine.alcoholPercentage, wine.confidence, quantity];
}

test("adds a new wine using the existing Dutch columns", async () => {
  const graph = graphMock();
  assert.deepEqual(await new ExcelStorageService().addWine(wine), { status: "WineAdded", bottleQuantity: 1 });
  assert.deepEqual(graph.rows[0], existing(1));
  assert.match(String(graph.calls.find(({ url }) => url.endsWith("/rows/add")).init.headers["workbook-session-id"]), /session/);
});

test("detects a duplicate without writing", async () => {
  const graph = graphMock({ initialRows: [existing(3)] });
  assert.deepEqual(await new ExcelStorageService().addWine({ ...wine, producer: " maison test ", wineName: "RÉSERVE" }), { status: "WineAlreadyExists", bottleQuantity: 3 });
  assert.equal(graph.calls.some(({ url }) => url.endsWith("/rows/add")), false);
});

test("re-reads Excel and increments only the quantity cell", async () => {
  const graph = graphMock({ initialRows: [existing(4)] });
  assert.deepEqual(await new ExcelStorageService().increaseBottleCount(wine), { status: "BottleQuantityIncreased", bottleQuantity: 5 });
  assert.deepEqual(graph.rows[0], existing(5));
});

test("serializes concurrent saves so the second request sees the first", async () => {
  const graph = graphMock();
  const service = new ExcelStorageService();
  const results = await Promise.all([service.addWine(wine), service.addWine(wine)]);
  assert.deepEqual(results, [{ status: "WineAdded", bottleQuantity: 1 }, { status: "WineAlreadyExists", bottleQuantity: 1 }]);
  assert.equal(graph.rows.length, 1);
});

test("maps Microsoft Graph failures without retaining workbook data", async () => {
  graphMock({ failAt: "/headerRowRange" });
  await assert.rejects(new ExcelStorageService().addWine(wine), (error) => error instanceof ExcelStorageError && error.code === "STORAGE_FAILED");
});

test("reports the exact missing environment variable before authentication", async () => {
  delete process.env.MICROSOFT_TENANT_ID;
  const graph = graphMock();

  await assert.rejects(
    new ExcelStorageService().addWine(wine),
    (error) => error instanceof ExcelStorageError && error.message === "Missing configuration: MICROSOFT_TENANT_ID",
  );
  assert.equal(graph.calls.length, 0);
});

test("reads Microsoft configuration from process.env and proceeds to authentication", async () => {
  const graph = graphMock();
  await new ExcelStorageService().addWine(wine);

  const authentication = graph.calls.find(({ url }) => url.includes("login.microsoftonline.com"));
  assert.ok(authentication);
  assert.match(authentication.url, /\/tenant\/oauth2\/v2\.0\/token$/);
  assert.equal(new URLSearchParams(String(authentication.init.body)).get("client_id"), "client");
});

test("retries a locked workbook and returns a clear error when it stays locked", async () => {
  const recovered = graphMock({ lockedWrites: 2 });
  assert.equal((await new ExcelStorageService().addWine(wine)).status, "WineAdded");
  assert.equal(recovered.calls.filter(({ url }) => url.endsWith("/workbook/createSession")).length, 3);

  graphMock({ lockedWrites: 10 });
  await assert.rejects(new ExcelStorageService().addWine(wine), (error) => error instanceof ExcelStorageError && error.code === "WORKBOOK_LOCKED");
});
