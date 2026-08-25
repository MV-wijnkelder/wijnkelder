import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import { GET } from "../src/app/api/debug/find-workbook/route.ts";

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  Object.assign(process.env, {
    MICROSOFT_TENANT_ID: "tenant",
    MICROSOFT_CLIENT_ID: "client",
    MICROSOFT_CLIENT_SECRET: "secret",
  });
});

afterEach(() => { globalThis.fetch = originalFetch; });

test("authenticates and returns the exact workbook found by Graph search", async () => {
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("login.microsoftonline.com")) return Response.json({ access_token: "token" });
    return Response.json({ value: [
      { id: "other", name: "Wijnkelder_MCHRDV.xlsx.bak", size: 1 },
      { id: "workbook-id", name: "Wijnkelder_MCHRDV.xlsx", parentReference: { path: "/drive/root:/Documents" }, size: 2048 },
    ] });
  };

  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    found: true,
    name: "Wijnkelder_MCHRDV.xlsx",
    id: "workbook-id",
    parentPath: "/drive/root:/Documents",
    size: 2048,
  });
  const search = calls.find(({ url }) => url.includes("graph.microsoft.com"));
  assert.match(search.url, /\/drive\/root\/search\(q='Wijnkelder_MCHRDV\.xlsx'\)/);
  assert.equal(search.init.headers.Authorization, "Bearer token");
});

test("returns found false when Graph has no exact filename match", async () => {
  globalThis.fetch = async (input) => String(input).includes("login.microsoftonline.com")
    ? Response.json({ access_token: "token" })
    : Response.json({ value: [{ id: "partial", name: "Wijnkelder_MCHRDV.xlsx.bak" }] });

  const response = await GET();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { found: false });
});

test("returns the original Microsoft Graph error diagnostics", async () => {
  let graphUrl;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("login.microsoftonline.com")) return Response.json({ access_token: "token" });
    graphUrl = url;
    return Response.json({
      error: {
        code: "accessDenied",
        message: "Access is denied.",
      },
    }, { status: 403 });
  };

  const response = await GET();

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    tokenObtained: true,
    graphUrl,
    graphStatus: 403,
    graphCode: "accessDenied",
    graphMessage: "Access is denied.",
  });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
