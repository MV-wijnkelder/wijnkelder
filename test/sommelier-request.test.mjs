import assert from "node:assert/strict";
import test from "node:test";
import { FRIENDLY_SOMMELIER_ERROR, requestSommelier } from "../src/lib/sommelier-request.ts";

test("retries one transient network failure and returns the successful reply", async () => {
  let calls = 0;
  const reply = await requestSommelier(() => new FormData(), async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("Failed to fetch");
    return Response.json({ reply: "Choose the Riesling." });
  });
  assert.equal(calls, 2);
  assert.equal(reply, "Choose the Riesling.");
});

test("retries a transient API response only once", async () => {
  let calls = 0;
  await assert.rejects(
    requestSommelier(() => new FormData(), async () => {
      calls += 1;
      return Response.json({ error: "Unavailable" }, { status: 503 });
    }),
    /Unavailable/,
  );
  assert.equal(calls, 2);
});

test("replaces raw network errors with a conversation-safe message", async () => {
  await assert.rejects(requestSommelier(() => new FormData(), async () => { throw new TypeError("Failed to fetch"); }), new RegExp(FRIENDLY_SOMMELIER_ERROR.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("stops an old request when a new conversation starts", async () => {
  const controller = new AbortController();
  let calls = 0;
  const pending = requestSommelier(() => new FormData(), async (_url, init) => {
    calls += 1;
    controller.abort();
    throw init?.signal?.reason ?? new DOMException("Aborted", "AbortError");
  }, controller.signal);
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});
