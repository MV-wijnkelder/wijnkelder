import assert from "node:assert/strict";
import test from "node:test";

import { AIService, parseRecognitionResponse } from "../src/services/ai-service.ts";

const wine = {
  producer: "Example Estate",
  wineName: "Example Wine",
  vintage: "2022",
  country: "France",
  region: "Bordeaux",
  appellation: null,
  grapeVarieties: ["Merlot"],
  wineColor: "Red",
  bottleSize: "750 ml",
  alcoholPercentage: 13.5,
  confidence: 91,
};

const jsonResponse = (body, init = {}) => new Response(JSON.stringify(body), {
  status: 200,
  headers: { "content-type": "application/json; charset=utf-8" },
  ...init,
});

test("single and dual label responses produce the exact same canonical schema", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  const responseBodies = [
    { recognized: true, wine },
    { recognized: true, wine: { ...wine, backLabel: new Blob(["not result data"]) }, backLabel: "blob:preview" },
  ];
  globalThis.fetch = async () => jsonResponse(responseBodies.shift());

  const front = new File(["front"], "front.jpg", { type: "image/jpeg" });
  const back = new File(["back"], "back.jpg", { type: "image/jpeg" });
  const single = await AIService.recognizeWine(front);
  const dual = await AIService.recognizeWine(front, back);

  assert.deepEqual(dual, single);
  assert.deepEqual(Object.keys(dual.wine), [...Object.keys(wine), "marketValue", "marketValueCurrency", "profile", "profileMetadata", "cellar"]);
  assert.doesNotMatch(JSON.stringify(dual), /backLabel|blob:/);
});

test("response parsing reads JSON text with a JSON content type", async () => {
  assert.deepEqual(await parseRecognitionResponse(jsonResponse({ recognized: false })), { recognized: false });
});

test("dual-label consistency warnings are preserved for the review workflow", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jsonResponse({
    recognized: true,
    wine: { ...wine, confidence: 35 },
    labelWarning: ["Vintage differs: 2021 and 2022"],
  });

  const result = await AIService.recognizeWine(
    new File(["front"], "front.jpg", { type: "image/jpeg" }),
    new File(["back"], "back.jpg", { type: "image/jpeg" }),
  );
  assert.deepEqual(result.labelWarning, ["Vintage differs: 2021 and 2022"]);
  assert.equal(result.wine.confidence, 35);
});

test("response parsing rejects non-JSON and malformed JSON responses", async () => {
  await assert.rejects(
    parseRecognitionResponse(new Response("ok", { headers: { "content-type": "text/plain" } })),
    /invalid response/,
  );
  await assert.rejects(
    parseRecognitionResponse(new Response("{", { headers: { "content-type": "application/json" } })),
    /invalid JSON/,
  );
});

test("every non-success path parses its JSON error message", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => jsonResponse({ error: "Request failed safely." }, { status: 400 });

  await assert.rejects(
    AIService.recognizeWine(new File(["front"], "front.jpg", { type: "image/jpeg" })),
    /Request failed safely/,
  );
});
