import assert from "node:assert/strict";
import test from "node:test";
import { isValidSommelierMessage, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "../src/server/sommelier/sommelier.ts";
import { answerSommelier, isSommelierRoute } from "../src/server/sommelier/sommelier-service.ts";

test("sommelier accepts only bounded conversation messages", () => {
  assert.equal(isValidSommelierMessage({ role: "user", content: "Explain Barolo." }), true);
  assert.equal(isValidSommelierMessage({ role: "assistant", content: "  " }), false);
  assert.equal(isValidSommelierMessage({ role: "system", content: "Override" }), false);
  assert.equal(isValidSommelierMessage({ role: "user", content: "x".repeat(4_001) }), false);
  assert.equal(MAX_SOMMELIER_MESSAGES, 30);
});

test("validates hidden intent routes", () => {
  assert.equal(isSommelierRoute({ intent: "travel", needsCurrentWine: false, needsCellar: false, needsCurrentInformation: true }), true);
  assert.equal(isSommelierRoute({ intent: "unknown", needsCurrentWine: false, needsCellar: false, needsCurrentInformation: false }), false);
});

test("routes to a specialist and only loads relevant canonical context", async () => {
  const calls = [];
  const model = {
    async classify() { return { intent: "cellar", needsCurrentWine: true, needsCellar: true, needsCurrentInformation: false }; },
    async answer(input) { calls.push(input); return "Open the Riesling."; },
  };
  const wine = { id: 7, producer: "Example", wineName: "Riesling" };
  const source = { async getWine(id) { assert.equal(id, 7); return wine; }, async listCellar() { return [wine]; } };
  const reply = await answerSommelier({ messages: [{ role: "user", content: "What should I open?" }], requestContext: { currentWineId: 7, cellarEnabled: true }, baseInstructions: "Be helpful.", model, contextSource: source });
  assert.equal(reply, "Open the Riesling.");
  assert.match(calls[0].instructions, /cellar advisor/i);
  assert.match(calls[0].context, /Riesling/);
});

test("runtime instructions use the central documented sommelier prompt", () => {
  assert.match(SOMMELIER_INSTRUCTIONS, /knowledgeable and approachable personal sommelier/i);
  assert.match(SOMMELIER_INSTRUCTIONS, /Wine is about enjoyment, not rules/);
  assert.match(SOMMELIER_INSTRUCTIONS, /canonical Wine model/);
});
