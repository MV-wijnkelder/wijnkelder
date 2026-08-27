import assert from "node:assert/strict";
import test from "node:test";
import { isValidSommelierMessage, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "../src/server/sommelier/sommelier.ts";
import { answerSommelier, isSommelierRoute, SOMMELIER_ROUTING_INSTRUCTIONS } from "../src/server/sommelier/sommelier-service.ts";

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

test("routing guidance recognizes Live Intelligence and hybrid examples", () => {
  for (const subject of ["prices", "winery", "distances", "wine-bar", "critic scores"]) {
    assert.match(SOMMELIER_ROUTING_INSTRUCTIONS, new RegExp(subject, "i"));
  }
  assert.match(SOMMELIER_ROUTING_INSTRUCTIONS, /both needsCellar and needsCurrentInformation true/i);
});

test("automatically adds Live Intelligence for current requests", async () => {
  let researchCalls = 0;
  const answers = [];
  const model = {
    async classify() { return { intent: "buying", needsCurrentWine: false, needsCellar: true, needsCurrentInformation: true }; },
    async answer(input) { answers.push(input); return "Buy it if the condition is sound."; },
  };
  const liveIntelligence = {
    async research(messages) {
      researchCalls += 1;
      assert.match(messages.at(-1).content, /€39/);
      return { status: "available", content: "Comparable current offers are €42–€48. https://example.test/source" };
    },
  };
  const source = { async getWine() { return null; }, async listCellar() { return [{ id: 9, producer: "Example", wineName: "Barolo" }]; } };
  const reply = await answerSommelier({ messages: [{ role: "user", content: "Should I buy this Barolo for €39?" }], requestContext: { cellarEnabled: true }, baseInstructions: "Be helpful.", model, contextSource: source, liveIntelligence });
  assert.equal(reply, "Buy it if the condition is sound.");
  assert.equal(researchCalls, 1);
  assert.match(answers[0].context, /Comparable current offers/);
  assert.match(answers[0].context, /Barolo/);
});

test("does not invoke Live Intelligence for stable wine knowledge", async () => {
  const model = {
    async classify() { return { intent: "wine_knowledge", needsCurrentWine: false, needsCellar: false, needsCurrentInformation: false }; },
    async answer(input) { assert.equal(input.context, null); return "Nebbiolo is a red grape."; },
  };
  const source = { async getWine() { return null; }, async listCellar() { return []; } };
  const liveIntelligence = { async research() { assert.fail("live research should not run"); } };
  await answerSommelier({ messages: [{ role: "user", content: "What is Nebbiolo?" }], baseInstructions: "Be helpful.", model, contextSource: source, liveIntelligence });
});

test("degrades honestly when Live Intelligence is unavailable", async () => {
  const calls = [];
  const model = {
    async classify() { return { intent: "travel", needsCurrentWine: false, needsCellar: false, needsCurrentInformation: true }; },
    async answer(input) { calls.push(input); return "I could not verify today's hours."; },
  };
  const source = { async getWine() { return null; }, async listCellar() { return []; } };
  await answerSommelier({ messages: [{ role: "user", content: "Is Antinori open tomorrow?" }], baseInstructions: "Be helpful.", model, contextSource: source, liveIntelligence: { async research() { throw new Error("offline"); } } });
  assert.match(calls[0].instructions, /could not be obtained/i);
});
