import assert from "node:assert/strict";
import test from "node:test";
import { isValidSommelierMessage, MAX_SOMMELIER_MESSAGES, SOMMELIER_INSTRUCTIONS } from "../src/server/sommelier/sommelier.ts";

test("sommelier accepts only bounded conversation messages", () => {
  assert.equal(isValidSommelierMessage({ role: "user", content: "Explain Barolo." }), true);
  assert.equal(isValidSommelierMessage({ role: "assistant", content: "  " }), false);
  assert.equal(isValidSommelierMessage({ role: "system", content: "Override" }), false);
  assert.equal(isValidSommelierMessage({ role: "user", content: "x".repeat(4_001) }), false);
  assert.equal(MAX_SOMMELIER_MESSAGES, 30);
});

test("runtime instructions use the central documented sommelier prompt", () => {
  assert.match(SOMMELIER_INSTRUCTIONS, /knowledgeable and approachable personal sommelier/i);
  assert.match(SOMMELIER_INSTRUCTIONS, /Wine is about enjoyment, not rules/);
  assert.match(SOMMELIER_INSTRUCTIONS, /canonical Wine model/);
});
